import { markAvatarPresence } from "../link-chat/avatar-presence";
import type { ChannelMuteScope } from '../../cloud/channel-timed-mutes';
import { CommunityNotificationDialog } from './community-notification-dialog';
import { openCommunityInvitations } from './community-invitations-dialog';
import type { CloudSyncQueue } from '../../cloud/sync-queue';
import {MediaUploadIntent,MediaGenerationError,mediaUploadError} from '../../cloud/media-upload-intent';
import {ChannelMutationIntent,channelMutationSource,type ChannelMutationSource} from '../../cloud/channel-mutation-intent';
import {CommunityEditIntent,communityEditSource,type CommunityEditSource} from '../../cloud/community-edit-intent';
import {CommunityManagementDialog,type CommunityManagementAction} from './community-management-dialog';
import {ModerationGeneration,moderationGenerationConflict,type ModerationAccess} from '../../cloud/moderation-generation';
import {captureReportSource,type ReportSource} from '../../cloud/report-source';
import { ThreadHistoryTimelinePanel } from '../link-chat/thread-history-timeline-panel';
import { ThreadHistoryRestorePanel } from '../link-chat/thread-history-restore-panel';
import { ThreadHistoryArchivePanel } from '../link-chat/thread-history-archive-panel';
import {checkedCommunityTemplate} from '../../../cloud/shared/community-template.mjs';
import { CommunityEditor, type CommunityManagerNavigation, type CommunityManagerSection, type CommunityManagerTab } from './community-editor';
import { renderCommunityManagerPanel } from './community-manager-panel';
import { renderCommunityArchive, renderCommunityLifecycleReview, renderCommunityOwnership } from './community-lifecycle-panel';
import { communityIcon, communityTags, type CommunityDesign } from './community-design';
import { BrowseFilters, iconButton, searchField } from './browse-controls';
import { fitPanelDialog } from './panel-dialog-layout';
import { revealDetailSection } from './detail-section-navigation';
import { eventRange, localZone } from './event-time';
import type { CalendarEvent } from './events-page';
import { calendarRead } from '../../cloud/calendar-mutation-intent';
import { spaceRead } from '../../cloud/space-mutation-intent';
import { CloudError, type CloudClient, type MediaReportScope } from '../../cloud/client';
import { ChannelReadRecovery, channelRecoveryConflict, type ChannelReadAccess } from '../../cloud/channel-read-recovery';
import { ChannelModerationPanel } from './channel-moderation';
import { targetReportDialog } from '../../cloud/target-report-dialog';
import { element, focusedElement } from '../../utils/dom';
import { MessageAudio } from '../../cloud/message-audio';
import { MessageReactions } from '../../cloud/message-reactions';
import { MentionPicker } from '../../cloud/mention-picker';
import { appendMentionText } from '../../cloud/mentions';
import { bindClockText, formatClockTime } from '../../core/time-format';
import type { MessageMention } from '../../core/types';
import { localDay, syncDateSeparators } from '../link-chat/date-separators';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { ShellActionMenu, type ShellAction } from './action-menu';
import { communityShareUrl } from './space-share';

type Role = 'owner' | 'admin' | 'moderator' | 'member';
interface SectionNavigation { trigger: HTMLButtonElement }
interface Community extends CommunityDesign {
  id: string; name: string; description: string; language: string; access: 'public' | 'request' | 'private';
  discoverable: boolean; invitationPermission: 'admins' | 'members'; rules: string[]; revision: number;
  createdAt?: number; archived: boolean; membership: string; role: Role | null; memberCount: number;
  canManage: boolean; canReview: boolean; canInvite: boolean; onlineCount?: number | null; upcomingEvents?: number; restricted?: boolean;
}
type PreviewEvent = Pick<CalendarEvent, 'id'|'title'|'description'|'startsAt'|'endsAt'|'going'|'capacity'> &
  Partial<Pick<CalendarEvent, 'category'|'language'|'visibility'|'status'|'tags'>>;
interface DirectoryEvent extends PreviewEvent {communityId:string|null;communityName:string|null;archived:boolean;status:CalendarEvent['status']}
interface PreviewSpace {id:string;name:string;description:string;canRead:boolean;access:string}
interface Channel { recoveryGeneration?: string; id: string; name: string; topic: string; visibility: string; posting: string; revision: number; canPost: boolean; members?: number[]; unread?: number; mentions?: number; latest?: number; mode?: string; preferenceRevision?: number }
interface Member { memberNumber: number; role: Role; state: string; displayName?: string | null; username?: string | null; avatarId?: string | null; profileVisible?: boolean; status?: 'online'|'idle'|'dnd'|'unavailable'; updatedAt?:number }
interface ManagerRoster {
  communityId:string; section:ManagerRosterSection; items:Member[]; cursor:number|null;
  search:string; role:string; online:boolean; recipient:string; target:number;
  loading:boolean; error:string; request:number;
}
interface ManagerLifecycleDraft { communityId:string; revision:number; name:string; archived:boolean; recipient:string; confirmation:string }
type ManagerLifecycleSection = 'ownership'|'archive';
interface Message { id: string; sequence: number; author: number; text: string; createdAt: number; mentions?: MessageMention[]; mediaIds?: string[]; audioIds?: string[] }
interface Audit { sequence: number; actor: number; action: string; target: string | null; createdAt: number }
interface Page<T> { items: T[]; nextCursor: number | null }
interface CommunityFormDraft {kind:'community'|'channel';id?:string|undefined;communityName:string;draft:Record<string,string>;baseline:string;intent:CommunityEditIntent;status:string;discard:boolean}
const roles: Record<Role, string> = { owner: 'Owner', admin: 'Administrator', moderator: 'Moderator', member: 'Member' };
const level: Record<Role, number> = { member: 0, moderator: 1, admin: 2, owner: 3 };
const managerMemberState = {members:'active',invitations:'invited',requests:'requested',ownership:'active'} as const;
type ManagerRosterSection = keyof typeof managerMemberState;
const labels: Record<string, string> = { overview: 'Overview', about: 'About', events: 'Events', mine: 'My communities', discover: 'Discover', channels: 'Channels', active: 'Members', requested: 'Requests', invited: 'Invitations', banned: 'Banned', audit: 'Activity', reports: 'Reports', archives: 'Archived channels', settings: 'Settings' };

/** Account-bound real Communities. Drafts stay in memory; every read rechecks server access. */
export class CommunitiesPage {
  readonly #notificationDialog:CommunityNotificationDialog|undefined;
  #notificationDefaults=false;
  readonly element = element('section', { className: 'kl-communities-page', ariaLabel: 'Communities' });
  readonly #content = element('div');
  readonly #overlays = element('div');
  readonly #channelMenu = new ShellActionMenu();
  readonly #communityMenu = new ShellActionMenu('explore');
  readonly #communityCardMenu = new ShellActionMenu('explore');
  readonly #memberMenu = new ShellActionMenu('explore');
  #channelOptions: HTMLDialogElement | undefined;
  readonly #channelSearch = element('input', { ariaLabel: 'Search channels' });
  readonly #channelSearchBox = searchField(this.#channelSearch, 'Clear channel search');
  #channelScroll: { id: string; top: number; following: boolean } | undefined;
  #channelListScroll = 0;
  readonly #historyArchive = new ThreadHistoryArchivePanel(this.element);
  readonly #historyCopies = new ThreadHistoryRestorePanel(this.element);
  readonly #historyTimeline = new ThreadHistoryTimelinePanel(this.element);
  readonly #search = element('input', { ariaLabel: 'Search communities' });
  readonly #searchBox: HTMLElement;
  readonly #filters: BrowseFilters;
  #directoryEnabled = false; #sort='recommended'; #activeOnly='0'; #withEvents='0'; #directoryCursor: string | null = null;
  readonly #memberSearch=element('input',{ariaLabel:'Search members'}); readonly #memberSearchBox:HTMLElement;
  #memberRole=''; #memberOnline='0'; #memberTimer:ReturnType<typeof setTimeout>|undefined;
  #listAccess = ''; #listLanguage = ''; #searchTimer: ReturnType<typeof setTimeout> | undefined;
  #management = false;#listKey='';#listTarget=20;#listScroll=0;#listReturnAction:string|undefined;#restoreList=false;
  #manageOnOpen:string|undefined;
  #managerRoster:ManagerRoster|undefined;
  #managerLifecycleDraft:ManagerLifecycleDraft|undefined;
  #managerSearchTimer:ReturnType<typeof setTimeout>|undefined;
  #eventsEnabled = false; #spacesEnabled = false; #previewError = '';
  #events: PreviewEvent[] = [];
  #spaces: PreviewSpace[] = [];
  #spacePreview: 'unread' | 'loaded' | 'empty' | 'error' = 'unread';

  readonly #audio: MessageAudio;
  readonly #communityEditor: CommunityEditor;
  #customizationEnabled = false;
  readonly #moderation: ChannelModerationPanel;
  #moderationEnabled = false;
  #archives: Channel[] = [];
  #closeDialog: (() => void) | undefined;
  #contextDrawer: HTMLDialogElement | undefined;
  #memberDetails: HTMLDialogElement | undefined;
  #invitationsOpen = false;
  readonly #mentions: MentionPicker;
  #reactions: MessageReactions | undefined;
  #rich = false;
  #audioEnabled = false;
  #target: string | undefined;
  #attachments = new Map<string, { mediaIds: string[]; audioIds: string[] }>();
  #upload: { channel: string; path:string; files: File[]; intents?:WeakMap<Blob,MediaUploadIntent>;controller?: AbortController | undefined; progress: number; error: string } | undefined;
  #readTimer: ReturnType<typeof setTimeout> | undefined;
  #readPending: object | undefined;
  readonly #channelRecovery: ChannelReadRecovery;
  #reportSource:ReportSource|undefined;readonly #reportSources=new WeakMap<object,ReportSource>();
  #channelAccess: ChannelReadAccess | undefined;
  #channelHold = false;
  #channelReopen = false;
  #olderPending: object | undefined;
  #readThrough = new Map<string, number>();
  readonly #unsubscribe: () => void;
  #releaseEvents: (() => void) | undefined;
  #timer: ReturnType<typeof setInterval> | undefined;
  #visible = false;
  #destroyed = false;
  #token = 0;
  #mutationBusy = false;
  get #busy():boolean{return this.#mutationBusy||this.#editorBusy||!!this.#communityEditor?.busy||!!this.#managementAction?.busy;}
  set #busy(value:boolean){this.#mutationBusy=value;}
  readonly #managementRecovery:ModerationGeneration;
  readonly #managementAction:CommunityManagementDialog;
  readonly #managementSources=new WeakMap<object,ModerationAccess>();
  #loading = false;
  #directoryLoading = false;
  #supported = false;
  #error = '';
  #directoryLoadError = '';
  #channelDirectoryFailed = false;
  #scope = 'mine';
  #tab = 'overview';
  #selected: string | undefined;
  #community: Community | undefined;
  #list: Community[] = [];
  #cursor: number | null = null;
  #channels: Channel[] = [];
  #channelId: string | undefined;
  #messages: Message[] = [];
  #messageCursor: number | null = null;
  #historyBefore = 0;
  #members: Member[] = [];
  #audit: Audit[] = [];
  #editor:CommunityFormDraft|undefined;
  readonly #editingSources=new WeakMap<object,CommunityEditSource>();
  #editorVisible=false;#editorBusy=false;#editEpoch=0;
  #drafts = new Map<string, string>();
  readonly #channelActions=new Map<string,ChannelMutationIntent>();
  readonly #mutationSources=new WeakMap<object,ChannelMutationSource>();
  readonly #channelOwner:number;readonly #channelOrigin:string;
  #discardChannelAction:string|undefined;
  #confirm: { text: string; run: () => void } | undefined;
  #scrollToChannel = false;
  #createEpoch = 0;
  #creating = false;
  constructor(readonly client: CloudClient, readonly options: { syncQueue?:CloudSyncQueue|undefined; openQueue?():void; current(): boolean; name(member: number): string; openEvents?(id: string): void; createEvent?(id: string, restoreFocus: () => void): void; openEvent?(id: string, community: string): void; openSpace?(id: string, community: string): void; openSpaces?(id: string): void; createSpace?(id: string, restoreFocus: () => void): void; blocked?(member: number): boolean; image?(id: string, scope?: MediaReportScope, generation?: string): HTMLElement; avatar?(id: string, own: boolean): HTMLElement | undefined; openProfile?(member: number): void; canMessageMember?(member: number): boolean; openMemberChat?(member: number, name?: string): void; openPeople?():void; onlineFriends?():ReadonlyArray<{memberNumber:number;memberName:string}>; channelMuteUntil?(scope: ChannelMuteScope): number; canSetChannelMute?(scope: ChannelMuteScope): boolean; openChannelMute?(scope: ChannelMuteScope, current: () => boolean, done: () => void): void; changed?(): void; enterToSend?(): boolean }) {
    this.#notificationDialog=options.syncQueue?new CommunityNotificationDialog(client,options.syncQueue,{current:()=>this.#visible&&!this.#destroyed&&options.current(),changed:()=>{options.changed?.();void this.refresh();},openQueue:()=>options.openQueue?.()}):undefined;
    if(this.#notificationDialog)this.element.append(this.#notificationDialog.element);
    this.#channelOwner=client.memberNumber;this.#channelOrigin=client.origin;
    this.#channelRecovery = new ChannelReadRecovery(client);
    this.#managementRecovery=new ModerationGeneration(client,'communityManagementRecoveryGeneration');
    this.#managementAction=new CommunityManagementDialog(client,this.#overlays,{
      current:()=>this.#visible&&!this.#destroyed&&options.current(),
      changed:()=>{if(!this.#destroyed)this.#render();},
      applied:action=>{
        if(action.membership&&action.path.endsWith('/leave')&&this.#selected===action.communityId){
          if(this.#contextDrawer)this.#closeDialog?.();
          this.#selected=undefined;
        }
        const roster=this.#managerRoster;
        if(roster?.communityId===action.communityId&&action.membership&&action.path.endsWith('/invite'))roster.recipient='';
        options.changed?.();void this.refresh();
      },
      focusAfterClose:(action,applied)=>this.#restoreManagerActionFocus(action,applied),
    });
    this.#memberSearch.type='search';this.#memberSearch.placeholder='Search name, @username or #number…';this.#memberSearch.maxLength=80;this.#memberSearch.dataset.communityField='member-search';this.#memberSearchBox=searchField(this.#memberSearch);
    this.#memberSearch.addEventListener('keydown',e=>e.stopPropagation());
    this.#memberSearch.addEventListener('input',()=>{++this.#token;clearTimeout(this.#memberTimer);this.#memberTimer=setTimeout(()=>{this.#cursor=null;void this.refresh();},250);});
    this.#search.type='search';this.#search.placeholder='Find your community…';this.#search.maxLength=80;this.#search.dataset.communityField = 'search'; this.#searchBox = searchField(this.#search, 'Clear community search');
    this.#filters = new BrowseFilters('Filter communities', [
      {key:'access',label:'Show communities',choices:[['','All'],['mine','My communities'],['public','Public'],['request','Request only'],['private','Private'],['archived','Archived']],presentation:'chips'},
      {key:'language',label:'Primary language',placeholder:'Any language',maxLength:40},
    ], values => {
      const mine = values.access === 'mine';
      if (mine || this.#directoryEnabled) this.#scope = mine ? 'mine' : 'all';
      clearTimeout(this.#searchTimer);
      this.#listAccess=mine?'':values.access!;this.#listLanguage=values.language!;this.#activeOnly=values.active??'0';this.#withEvents=values.events??'0';this.#list=[];this.#cursor=null;void this.refresh();
    }, { submitLabel: 'Show communities', description: 'Choose what matters to you.' });
    this.#search.addEventListener('input',()=>{++this.#token;clearTimeout(this.#searchTimer);this.#searchTimer=setTimeout(()=>{this.#list=[];this.#cursor=null;void this.refresh();},250);});
    this.#search.addEventListener('keydown',e=>e.stopPropagation());
    this.#channelSearch.type = 'search';
    this.#channelSearch.placeholder = 'Find a channel…'; this.#channelSearch.dataset.communityField = 'channel-search';
    this.#channelSearch.maxLength = 80;
    this.#channelSearch.addEventListener('keydown', event => event.stopPropagation());
    this.#channelSearch.addEventListener('input', () => {
      const list = this.#content.querySelector<HTMLElement>('.kl-cm-channel-rows');
      if (list) {
        if (!this.#loading) this.#renderChannelRows(list);
        list.scrollTop = 0;
        this.#channelListScroll = 0;
      }
    });
    this.#channelMenu.element.id = 'kl-community-channel-menu';
    this.#communityMenu.element.id = 'kl-community-options';
    this.#communityCardMenu.element.id = 'kl-community-card-options';
    this.#memberMenu.element.id = 'kl-community-member-options';
    this.#memberMenu.element.classList.add('kl-cm-member-options', 'kl-explore-detail-options');
    this.element.hidden = true; this.element.append(this.#content, this.#overlays, this.#filters.dialog);
    this.#audio = new MessageAudio(client, this.#overlays);
    this.#communityEditor = new CommunityEditor(client,{current:()=>this.#visible&&!this.#destroyed&&options.current(),saved:id=>{options.changed?.();this.open(id);},updated:()=>{options.changed?.();void this.refresh();},failed:message=>{this.#error=message;this.#render();},changed:()=>{if(this.#visible&&!this.#destroyed)this.#render();}});this.element.append(this.#communityEditor.element);
    this.#moderation = new ChannelModerationPanel(client, { ...options, current: () => this.#visible && this.#tab === 'reports' && options.current() });
    this.#mentions = new MentionPicker(client, member => options.blocked?.(member) ?? false);
    this.element.addEventListener('scroll', this.#scheduleRead, true);
    document.addEventListener('visibilitychange', this.#scheduleRead);
    this.#unsubscribe = client.subscribe(kind => {
      const memberPrivacyChanged = this.#directoryEnabled && this.#tab === 'active' && ['privacy','relationships'].includes(kind);
      if (['session','disconnected','communities','blocks'].includes(kind)) { this.#notificationDialog?.hide(); this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#moderation.hide(); }
      if (this.#contextDrawer && ['calendar','privacy','relationships','profiles-cleared','ready'].includes(kind)) this.#closeDialog?.();
      if (kind === 'community-reports') void this.#moderation.refresh();
      if (kind === 'session' || kind === 'disconnected' || !client.connected || !options.current()) {
        this.#managementRecovery.invalidate();this.#managementAction.hide();
        this.#channelRecovery.invalidate(); this.#channelAccess = undefined; this.#channelHold = false; this.#channelReopen = false; this.#olderPending = undefined; this.#readPending = undefined; clearTimeout(this.#readTimer);
        this.#createEpoch++; this.#creating = false;
        this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#moderation.hide(); this.#filters.close(); this.#hideEditors(); this.#events=[];this.#spaces=[];this.#spacePreview='unread';this.#search.value='';this.#memberSearch.value='';this.#memberRole='';this.#memberOnline='0';this.#directoryCursor=null;clearTimeout(this.#memberTimer);
        ++this.#token; this.#community = undefined; this.#list = []; this.#messages = []; this.#members = []; this.#channels = []; this.#audit = [];
        this.#editorVisible=false;++this.#editEpoch; this.#confirm = undefined;  this.#readThrough.clear(); this.#upload?.controller?.abort(); this.#upload = undefined; this.#audio.pause(); this.#mentions.close(); this.#busy = false;
        if (this.#visible) void this.refresh();
      } else if (this.#visible && !this.#busy) {
        if (kind === 'spaces' && this.#spacesEnabled && this.#tab === 'overview' && this.#selected) void this.refresh(false, true);
        else if (memberPrivacyChanged || ['communities', 'channel-read', 'channel-messages', 'ready', 'connection', 'connected', 'reconnected', 'profiles-cleared', 'profiles', 'presence', 'calendar', 'blocks', 'media-invalidated'].includes(kind)) void this.refresh(false, kind === 'channel-messages' || kind === 'channel-read');
      }
    });
  }
  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    if (this.#visible === visible || this.#destroyed) return;
    this.#visible = visible;
    if (!visible) { this.#manageOnOpen=undefined;this.#notificationDialog?.hide();this.#managementAction.hide();this.#createEpoch++; this.#creating = false; this.#channelOptions?.close(); this.#channelMenu.close(false); this.#communityMenu.close(false); this.#communityCardMenu.close(false); this.#memberMenu.close(false); }
    if (visible) {
      this.#releaseEvents = this.client.retainEvents();
      this.#timer = setInterval(() => { if (!this.#busy && !this.#editor) void this.refresh(false, true); }, 30000);
      void this.refresh();
    } else { clearTimeout(this.#memberTimer); this.#hideEditors(); this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#filters.close(); clearTimeout(this.#searchTimer); this.#moderation.hide(); ++this.#token; this.#releaseEvents?.(); this.#releaseEvents = undefined; clearInterval(this.#timer); this.#messages = []; this.#loading = false; this.#directoryLoading = false; this.#audio.pause(); this.#mentions.close(); this.#reactions?.pause(); this.#upload?.controller?.abort(); clearTimeout(this.#readTimer); }
  }
  open(id?: string, channelId?: string, messageId?: string): void { this.#manageOnOpen=undefined;this.#notificationDialog?.hide(); this.#managementAction.hide();this.#createEpoch++; this.#creating = false; this.#hideEditors(); this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#moderation.hide(); this.#audio.pause(); this.#upload?.controller?.abort(); this.#upload = undefined; this.#selected = id; this.#community = undefined;this.#memberSearch.value='';this.#memberRole='';this.#memberOnline='0';clearTimeout(this.#memberTimer); this.#channelId = channelId; this.#target = messageId; this.#historyBefore = 0; this.#channelSearch.value = ''; this.#channelScroll = undefined; this.#scrollToChannel = !!channelId; this.#editorVisible=false;++this.#editEpoch; this.#confirm = undefined; this.#events=[];this.#spaces=[];this.#spacePreview='unread';this.#management=false;this.#tab = channelId ? 'channels' : 'overview'; clearTimeout(this.#searchTimer);this.#filters.close();this.setVisible(true); void this.refresh(); }
  destroy(): void { this.#notificationDialog?.destroy();this.setVisible(false); this.#destroyed = true;this.#communityEditor.close();this.#editor=undefined;this.#managementAction.destroy(); this.#channelRecovery.invalidate(); ++this.#token; this.#unsubscribe(); this.#moderation.destroy(); this.#audio.destroy(); this.#mentions.destroy(); this.#reactions?.destroy(); this.#channelMenu.destroy(); this.#communityMenu.destroy(); this.#communityCardMenu.destroy(); this.#memberMenu.destroy(); document.removeEventListener('visibilitychange', this.#scheduleRead); this.#attachments.clear(); this.#drafts.clear(); this.#channelActions.clear(); this.element.replaceChildren(); }
  #valid(token: number): boolean { return !this.#destroyed && this.#visible && token === this.#token && this.#channelRecovery.identityCurrent() && this.options.current(); }
  /** Shell entry point. Recheck capabilities without resetting an existing draft. */
  async create(): Promise<void> {
    if (!this.#valid(this.#token) || this.#busy || this.#creating) return;
    if(this.#reviewEditing())return;
    const epoch = ++this.#createEpoch;
    const valid = () => epoch === this.#createEpoch && this.#valid(this.#token);
    this.#creating = true; this.#error = ''; this.#render();
    try {
      const me = await this.client.request<{ memberNumber: number; features?: { communities?: boolean; communityCustomization?: boolean } }>('GET', '/v1/me');
      if (!valid()) return;
      if (me.memberNumber !== this.client.memberNumber) throw new Error('Account changed');
      if (!me.features?.communities) { this.#supported = false; this.#error = 'Community creation is not available on this server.'; this.#render(); return; }
      if (this.#communityEditor.unfinished || this.#editor) return;
      this.#supported = true; this.#customizationEnabled = !!me.features.communityCustomization; this.#error = '';
      this.#editCommunity(undefined,communityEditSource(me));
    } catch {
      if (valid()) { this.#error = 'Could not open community creation. Try Create a community again.'; this.#render(); }
    } finally { if (epoch === this.#createEpoch) { this.#creating = false; if (valid()) this.#render(); } }
  }
  /** Check the installed review while Workshop is still visible; then hand off synchronously. */
  async prepareTemplate(value:unknown,sourceTitle:string,review:()=>boolean):Promise<()=>void> {
    const available=()=>!this.#destroyed&&this.#channelRecovery.identityCurrent()&&this.client.connected&&this.options.current()&&!this.#busy&&!this.#communityEditor.unfinished&&!this.#editor;
    if(!available()||this.#creating||!review())throw new Error('Finish or discard your current community draft first.');
    const payload=checkedCommunityTemplate(value),member=this.client.memberNumber,epoch=++this.#createEpoch;
    const valid=()=>epoch===this.#createEpoch&&member===this.client.memberNumber&&available();this.#creating=true;
    try{
      const me=await this.client.request<{memberNumber:number;features?:{communities?:boolean;communityCustomization?:boolean;workshopCommunityTemplates?:boolean}}>('GET','/v1/me');
      if(!valid()||!review()||me.memberNumber!==member)throw new Error('Your account, installation or community draft changed. Reopen the template review.');
      if(me.features?.communities!==true||me.features.communityCustomization!==true||me.features.workshopCommunityTemplates!==true)throw new Error('Community templates require the pending Cloud update.');
      this.#supported=true;this.#customizationEnabled=true;
      const source=communityEditSource(me);let used=false;
      return()=>{if(used||!valid()||!this.#visible)throw new Error('Community creation changed. Reopen the template review.');used=true;this.#communityEditor.openTemplate(payload,sourceTitle,source);this.#render();};
    }finally{if(epoch===this.#createEpoch)this.#creating=false;}
  }
  openReports(id: string): void { this.open(id); this.#management=true; this.#tab='reports'; if(this.#visible)void this.refresh(); }
  #base(): string { return `/v1/communities/${this.#selected}`; }
  #messageBase(): string { return `${this.#base()}/channels/${this.#channelId}/messages`; }
  #name(member: number): string { return `${this.options.name(member) || 'Member'} · #${member}`; }
  #directoryQueryKey(): string {
    return JSON.stringify([this.#scope, this.#search.value.trim(), this.#listLanguage, this.#listAccess, this.#sort, this.#activeOnly, this.#withEvents]);
  }
  #signature(): string { return JSON.stringify([this.#managementRecovery.revision,[...this.#channelActions.values()].map(a=>[a.target.path,a.held,a.notice]),this.#channelHold,this.#selected,this.#list,this.#cursor,this.#supported,this.#rich,this.#community,this.#channels.map(ch=>[ch.id,ch.name,ch.topic,ch.visibility,ch.posting,ch.revision,ch.canPost,ch.members]),this.#messages,this.#members,this.#audit,this.#archives,this.#events,this.#spaces,this.#spacePreview,this.#previewError,this.#error,this.#directoryLoadError]); }
  async refresh(append = false, background = false, navigation?: SectionNavigation): Promise<void> {
    if (this.#memberDetails?.open) this.#closeDialog?.();
    this.#memberMenu.close();
    const signature = this.#signature();
    const token = ++this.#token;
    const channelQuery = this.#channelSearch.value;
    let channelDirectoryRead = this.#tab === 'channels';
    const directoryLoading = !this.#selected && !append && (this.#directoryLoading ||
      !background && (!this.#list.length || this.#listKey !== this.#directoryQueryKey()));
    this.#directoryLoading = directoryLoading;
    this.#loading = true; this.#error = ''; this.#directoryLoadError = ''; this.#channelDirectoryFailed = false;
    const gatedActions = background ? [...this.#content.querySelectorAll<HTMLButtonElement>('.kl-cm-about-actions > button, [data-community-action="create-event"], [data-community-action="create-space"]')] : [];
    for (const button of gatedActions) button.setAttribute('aria-disabled', 'true');
    if(this.#managerRoster){
      this.#managerRoster.request++;this.#managerRoster.loading=true;
      if(!background){this.#managerRoster.items=[];this.#managerRoster.cursor=null;this.#communityEditor.refreshManagerPanel();}
    }
    // A revoked channel must never remain visible while a fresh permission check is pending.
    if (!background) { this.#messages = []; this.#members = []; this.#audit = []; this.#audio.pausePlayback(); this.#mentions.close(); this.#render(navigation); if(this.#communityEditor.managerTab==='archive')this.#communityEditor.refreshManagerPanel(); }
    if (!this.client.connected || !this.options.current()||!this.#channelIdentity()) { this.#loading = false; this.#directoryLoading = false; this.#supported = false; if(this.#contextDrawer || this.#invitationsOpen)this.#closeDialog?.(); this.#render(); return; }
    try {
      const me = await this.client.request<{ features?: { communityNotificationPreferences?:boolean; communityDirectory?: boolean; communityCustomization?: boolean; communities?: boolean; channelMessaging?: boolean; channelModeration?: boolean; messageAudio?: boolean; eventsRsvp?: boolean; persistentSpaces?: boolean } }>('GET', '/v1/me');
      if (!this.#valid(token)) return;
      if (this.#channelRecovery.accept(me)) this.#holdChannel();
      const access = this.#channelRecovery.capture(),mutation=channelMutationSource(me);
      if(mutation.required&&mutation.generation!==access.generation)throw new Error('Channel mutation source could not be verified');
      for(const a of this.#channelActions.values())a.observe(mutation);
      if(this.#managementRecovery.accept(me)){this.#holdManagementRead();append=false;}
      const management=this.#managementRecovery.capture(),editing=communityEditSource(me);this.#communityEditor.observe(editing);this.#editor?.intent.observe(editing);
      this.#reportSource=captureReportSource(this.client,me,()=>this.#visible&&this.options.current());
      if (this.#channelReopen) { this.#channelReopen = false; this.#channelHold = false; }
      if(this.#directoryEnabled!==!!me.features?.communityDirectory){
        if (this.#invitationsOpen) this.#closeDialog?.();
        this.#directoryEnabled=!!me.features?.communityDirectory;this.#scope=this.#directoryEnabled?'all':'mine';this.#directoryCursor=null;this.#listKey='';
        this.#filters.close();
        if(this.#directoryEnabled)this.#filters.fields.splice(1,0,
          {key:'active',label:'Active now',presentation:'checkbox',description:'More than 5 members online'},
          {key:'events',label:'Upcoming events',presentation:'checkbox',description:'Something to look forward to'});
        else this.#filters.fields.splice(1,2);
      }
      this.#customizationEnabled=!!me.features?.communityCustomization;if(!this.#customizationEnabled)this.#communityEditor.hold();
      if (this.#contextDrawer && (this.#eventsEnabled!==!!me.features?.eventsRsvp || !me.features?.communities)) this.#closeDialog?.();
      this.#eventsEnabled=!!me.features?.eventsRsvp;this.#spacesEnabled=!!me.features?.persistentSpaces;
      this.#notificationDefaults=!!me.features?.communityNotificationPreferences;if(!this.#notificationDefaults)this.#notificationDialog?.hide();
      this.#moderationEnabled = !!me.features?.channelModeration; this.#supported = me.features?.communities === true; this.#rich = !!me.features?.channelMessaging; this.#audioEnabled = this.#rich && !!me.features?.messageAudio;
      if (!this.#supported) { if (this.#invitationsOpen) this.#closeDialog?.(); this.#community = undefined; this.#list = []; this.#communityEditor.hold(); return; }
      if (!this.#selected) {
        const key=this.#directoryQueryKey();if(key!==this.#listKey){this.#listKey=key;this.#listTarget=20;append=false;}
        const target=append?20:this.#listTarget;
        if(this.#directoryEnabled){
          let cursor=append?this.#directoryCursor:null;const found:Community[]=[],seen=new Set<string>();
          do {
            const query=new URLSearchParams({scope:this.#scope,q:this.#search.value.trim(),language:this.#listLanguage,access:this.#listAccess,sort:this.#sort,active:this.#activeOnly,events:this.#withEvents,limit:String(Math.min(40,target-found.length))});
            if(cursor)query.set('cursor',cursor);
            const page=await management.request<{items:Community[];nextCursor:string|null}>('GET',`/v1/community-directory?${query}`);if(!this.#valid(token))return;
            found.push(...page.items.filter(c=>!found.some(old=>old.id===c.id)));cursor=page.nextCursor;
            if(found.length>=target||!cursor||seen.has(cursor))break;seen.add(cursor);
          }while(this.#valid(token));
          this.#list=append?[...this.#list,...found.filter(c=>!this.#list.some(old=>old.id===c.id))]:found;this.#directoryCursor=cursor;this.#cursor=cursor?1:null;
        }else{
        const query=this.#search.value.trim().toLocaleLowerCase(),language=this.#listLanguage.trim().toLocaleLowerCase(),filtered=!!(query||language||this.#listAccess);
        let cursor=append?this.#cursor??0:0,nextCursor:number|null=null; const found:Community[]=[],seen=new Set<number>();
        do {
          seen.add(cursor);
          const page=await management.request<Page<Community>>('GET',`/v1/communities?scope=${this.#scope}&limit=${filtered?40:20}&cursor=${cursor}`);
          if(!this.#valid(token))return;
          found.push(...page.items.filter(c=>(!query||`${c.name} ${c.description} ${(c.tags??[]).join(' ')}`.toLocaleLowerCase().includes(query))&&(!language||c.language.toLocaleLowerCase()===language)&&(!this.#listAccess||(this.#listAccess==='archived'?c.archived:!c.archived&&c.access===this.#listAccess))));
          nextCursor=page.nextCursor;
          if(found.length>=target||page.nextCursor===null||seen.has(page.nextCursor))break;
          cursor=page.nextCursor;
        }while(this.#valid(token));
        this.#list=append?[...this.#list,...found.filter(c=>!this.#list.some(old=>old.id===c.id))]:found;
        this.#cursor=nextCursor;
        }
        for (const community of this.#list) {
          if (!this.#managementSources.has(community)) this.#managementSources.set(community, management);
          if (this.#reportSource && !this.#reportSources.has(community)) this.#reportSources.set(community, this.#reportSource);
        }
        this.#listTarget=Math.max(20,this.#list.length);this.#community=undefined;
      } else {
        const c = await management.request<Community>('GET', this.#base());
        if (!this.#valid(token)) return;
        if(this.#reportSource)this.#reportSources.set(c,this.#reportSource);
        const previous = this.#community;
        this.#managementSources.set(c,management);this.#editingSources.set(c,editing);this.#community = c;
        if (this.#showGuestSections(c) && !this.#communityTabs().includes(this.#tab)) this.#tab = 'overview';
        if (this.#contextDrawer && (previous?.revision !== c.revision || previous?.membership !== c.membership || previous?.access !== c.access || previous?.role !== c.role ||
          previous?.archived !== c.archived || previous?.restricted !== c.restricted)) this.#closeDialog?.();
        this.#reconcileManagerLifecycle(c);this.#communityEditor.sync(c,editing);this.#managementAction.invalidateUnauthorized();
        if(this.#editor?.intent.target.communityId===c.id){this.#editor.intent.observe(editing);if(!c.canManage||c.archived||c.membership!=='active')this.#editor.intent.hold();} this.#channels = []; this.#members = []; this.#audit = [];this.#events=[];this.#spaces=[];this.#spacePreview='unread';this.#previewError='';
        if(this.#managerRoster)void this.#loadManagerRoster(this.#managerRoster);
        if (c.membership !== 'active' || c.archived) { this.#notificationDialog?.hide(); this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); if(!this.#contextDrawer)this.#closeDialog?.(); this.#moderation.hide(); this.#messages = []; for(const a of this.#channelActions.values())if(a.target.communityId===c.id)a.hold(); this.#upload?.controller?.abort(); this.#upload = undefined; this.#audio.pause(); this.#channelId = undefined; this.#editorVisible=false;++this.#editEpoch; return; }
        if (['overview','events'].includes(this.#tab)) {
          const previews=await Promise.allSettled([
            this.#eventsEnabled?this.client.request<{items:PreviewEvent[]}>('GET',`/v1/calendar/events?scope=all&when=upcoming&communityId=${c.id}&limit=3`):Promise.resolve({items:[]}),
            this.#tab === 'overview' && this.#spacesEnabled ? this.#loadSpacePreview(c, me, token) : undefined,
          ]);
          if(!this.#valid(token))return;
          const [events,spaces]=previews;
          if(events.status==='fulfilled')this.#events=events.value.items;else this.#previewError='Some community previews could not load.';
          if (spaces.status === 'fulfilled' && spaces.value) {
            this.#spaces = spaces.value.items;
            this.#spacePreview = spaces.value.empty ? 'empty' : 'loaded';
          } else if (spaces.status === 'rejected') {
            this.#spacePreview = 'error';
            this.#previewError = 'Some community previews could not load.';
          }
        }
        if (this.#tab === 'channels' || this.#tab === 'overview') {
          const channels = await access.request<{ items: Channel[] }>('GET', `${this.#base()}/channels`);
          if (!this.#valid(token)) return;
          channelDirectoryRead = false;
          this.#channelAccess = access;
          this.#channels = channels.items.map(ch => ({ ...ch, ...(access.generation ? { recoveryGeneration: access.generation } : {}) }));
          for(const ch of this.#channels){this.#managementSources.set(ch,management);this.#editingSources.set(ch,editing);this.#mutationSources.set(ch,mutation);}
          if (this.#channelId && !channels.items.some(ch => ch.id === this.#channelId)) { for(const a of this.#channelActions.values())if(a.target.channelId===this.#channelId)a.hold(); this.#audio.pause(); this.#messages = []; this.#upload?.controller?.abort(); this.#channelId = undefined; }
          if (this.#channelId && this.#tab === 'channels' && !this.#channelHold) {
            const page = await access.request<Page<Message>>('GET', `${this.#messageBase()}?limit=40&${this.#target ? `around=${encodeURIComponent(this.#target)}` : `cursor=${this.#historyBefore}`}`);
            if (!this.#valid(token)) return;
            for(const m of page.items){this.#reportSources.set(m,access);this.#mutationSources.set(m,mutation);}this.#messages = page.items; this.#messageCursor = page.nextCursor;
          }
        } else if (this.#tab === 'about' || this.#tab === 'events') {
          // These sections use the fresh community and authorized previews above.
        } else if (this.#tab === 'reports') {
          if (!c.canReview || !this.#moderationEnabled) { this.#moderation.hide(); this.#tab = 'channels'; return; }
          await this.#moderation.show(c.id);
        } else if (this.#tab === 'archives') {
          if (!c.canManage || !this.#moderationEnabled) { this.#tab = 'channels'; return; }
          const page = await management.request<{ items: Channel[] }>('GET', `${this.#base()}/archived-channels`);
          if (!this.#valid(token)) return;for(const ch of page.items)this.#managementSources.set(ch,management);this.#archives = page.items;
        } else if (this.#tab === 'audit') {
          if (!c.canReview) { this.#tab = 'channels'; return; }
          const page = await management.request<Page<Audit>>('GET', `${this.#base()}/audit?limit=40&cursor=${append ? this.#cursor ?? 0 : 0}`);
          if (!this.#valid(token)) return;
          this.#audit = page.items; this.#cursor = page.nextCursor;
        } else {
          if (this.#tab === 'requested' && !c.canReview || ['invited','banned'].includes(this.#tab) && !c.canManage) { this.#tab = 'channels'; return; }
          let cursor=append?this.#cursor??0:0;const found:Member[]=[];const seen=new Set<number>();
          do{
            const query=new URLSearchParams({state:this.#tab,limit:String(40-found.length),cursor:String(cursor)});
            if(this.#directoryEnabled){query.set('q',this.#memberSearch.value.trim());query.set('role',this.#memberRole);query.set('online',this.#memberOnline);}
            const page=await management.request<Page<Member>>('GET',`${this.#base()}/members?${query}`);if(!this.#valid(token))return;
            found.push(...page.items);this.#cursor=page.nextCursor;if(found.length>=40||page.nextCursor===null||seen.has(page.nextCursor))break;
            cursor=page.nextCursor;seen.add(cursor);
          }while(this.#valid(token));
          this.#members=found;
        }
      }
    } catch (error) {
      if (!this.#valid(token)) return;
      this.#channelReopen = false;
      if (channelRecoveryConflict(error)) this.#holdChannel();
      if(moderationGenerationConflict(error))this.#holdManagementRead();
      const message = this.#errorText(error);
      if (this.#selected) {
        this.#error = message;
        this.#channelDirectoryFailed = channelDirectoryRead;
        if (channelDirectoryRead) { this.#channels = []; this.#channelAccess = undefined; }
      }
      else {
        this.#directoryLoadError = error instanceof CloudError && error.code === 'invalid_directory_cursor'
          ? message : 'Your communities are safe. Give the connection another try.';
        this.#list = []; this.#cursor = null; this.#directoryCursor = null;
      }
      this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#moderation.hide();
      if(this.#managerRoster){this.#managerRoster.loading=false;this.#managerRoster.items=[];this.#managerRoster.error=message;this.#communityEditor.refreshManagerPanel();}
      if (error instanceof CloudError && [403,404].includes(error.status)) { this.#hideEditors(); this.#community = undefined;this.#managementAction.invalidateUnauthorized(); this.#editorVisible=false;++this.#editEpoch; this.#channels = []; this.#messages = []; this.#members = []; this.#audit = [];this.#events=[];this.#spaces=[];this.#spacePreview='unread'; this.#audio.pause(); }
    } finally { if (token === this.#token && !this.#destroyed) { this.#loading = false; this.#directoryLoading = false;
      if (!background || directoryLoading || channelQuery !== this.#channelSearch.value || gatedActions.some(button => !button.isConnected) || signature !== this.#signature()) this.#render(navigation);
      else { for (const button of gatedActions) button.removeAttribute('aria-disabled');
        for (const ch of this.#channels) { const badges=this.#content.querySelector<HTMLElement>(`[data-community-action="channel-${ch.id}"] .kl-cm-channel-badges`);if(badges)this.#renderChannelBadges(badges,ch); }
        const preference=this.element.querySelector<HTMLSelectElement>('[data-community-field="notifications"]');if(preference&&!this.#channelActions.has(`${this.#base()}/channels/${this.#channelId}/preferences`))preference.value=this.#channels.find(c=>c.id===this.#channelId)?.mode??'mentions';
        this.#scheduleRead();
      }
      if(this.#communityEditor.managerTab==='archive'||this.#communityEditor.managerTab==='ownership')this.#communityEditor.refreshManagerPanel();
      if(this.#manageOnOpen){
        const community=this.#community,id=this.#manageOnOpen;
        this.#manageOnOpen=undefined;
        if(!this.#error&&community?.id===id&&this.#customizationEnabled&&this.#canOpenManager(community))this.#editCommunity(community);
      }
    } }
  }
  #errorText(error: unknown): string {
    if(moderationGenerationConflict(error))return 'Community information changed. Refresh it before starting another action; unfinished actions are kept separately.';
    const code = error instanceof CloudError ? error.code : '';
    const messages: Record<string, string> = { invalid_directory_cursor: 'This directory page expired. Refresh the list to continue.', community_restricted:'This community is restricted by platform moderators.', revision_conflict: 'This community changed. Review the latest information and save again.', community_membership_required: 'Your membership no longer gives access to this community.', community_role_required: 'Your role no longer permits this action.', channel_unavailable: 'This channel is no longer available to you.', channel_read_only: 'Only the community team can post here.', community_full: 'This community has reached its member limit.', recipient_unavailable: 'This member cannot receive an invitation.', community_banned: 'This membership is restricted.', transfer_ownership_first: 'Transfer ownership before leaving.', review_join_request: 'Review this member’s existing join request.', community_invitation_required: 'An invitation is required.', not_found: 'This community is no longer available.' };
    return messages[code] ?? 'Could not complete the request. Reconnect or try again.';
  }
  #channelIdentity():boolean{return this.client.memberNumber===this.#channelOwner&&this.client.origin===this.#channelOrigin;}
  #sendIntent(c:Community,ch:Channel):ChannelMutationIntent|undefined {
    if(!this.#channelIdentity()||this.#channelHold)return;
    const path=`/v1/communities/${c.id}/channels/${ch.id}/messages`,old=this.#channelActions.get(path);if(old)return old;
    const source=this.#mutationSources.get(ch);if(!source)return;
    const intent=new ChannelMutationIntent(this.client,{kind:'send',path,communityId:c.id,channelId:ch.id,revision:ch.revision,label:`${c.name} / #${ch.name}`},source);
    this.#channelActions.set(path,intent);return intent;
  }
  async #runChannelAction(intent:ChannelMutationIntent,data:Record<string,unknown>):Promise<void>{
    if(this.#busy||this.#loading||!this.#valid(this.#token)||intent.held||intent.busy||!intent.identity())return;
    const token=this.#token;this.#busy=true;this.#error='';this.#confirm=undefined;this.#render();
    try{
      const result=await intent.send(data,()=>this.#valid(token));
      if(!result||!this.#valid(token))return;
      this.#channelActions.delete(intent.target.path);
      if(intent.target.kind==='send'){
        if(this.#drafts.get(intent.target.path)?.trim()===intent.pending?.text)this.#drafts.delete(intent.target.path);
        this.#attachments.delete(intent.target.path);this.#historyBefore=0;this.#target=undefined;
      }
      this.options.changed?.();await this.refresh();
    }catch{if(this.#valid(token))this.#error=intent.notice;}
    finally{this.#busy=false;if(!this.#destroyed)this.#render();}
  }
  #renderChannelAttempts(root:HTMLElement):void {
    if(!this.#channelIdentity()||!this.options.current())return;
    const actions=[...this.#channelActions.values()].filter(a=>a.target.kind!=='query'&&(a.pending||a.held||a.target.channelId!==this.#channelId||a.target.communityId!==this.#selected||!this.client.connected));
    if(!actions.length)return;
    const panel=element('section',{className:'kl-mod-notice',ariaLabel:'Unfinished channel actions'});root.append(panel);
    for(const a of actions){
      const t=a.target,details=element('details',{className:'kl-cm-retained-action'}),summary=element('summary',{text:`${t.label??'Channel'} · ${t.kind==='send'?'Unsent message':t.kind==='delete'?'Delete message':t.kind==='reaction'?'Reaction':'Notifications'}`});
      details.open=a.held;details.append(summary,element('p',{text:a.notice||'The original action is kept. A retry uses the same details.'}));
      const text=t.kind==='send'?this.#drafts.get(t.path)??String(a.pending?.text??''):[t.preview,a.pending?.reason,a.pending?.mode,a.pending?.reaction===null?'Remove reaction':a.pending?.reaction].filter(v=>v!==undefined).join('\n');
      if(text){const copy=element('textarea',{ariaLabel:'Retained channel details'});copy.value=text;copy.readOnly=true;details.append(copy);}
      const attachments=this.#attachments.get(t.path);
      if(t.kind==='send'&&attachments&&(attachments.mediaIds.length||attachments.audioIds.length)){const copy=element('textarea',{ariaLabel:'Retained attachment IDs'});copy.value=[...attachments.mediaIds,...attachments.audioIds].join('\n');copy.readOnly=true;details.append(copy);}
      if(a.pending&&!a.held){const retry=this.#button('retry-channel-action','Retry original action',()=>void this.#runChannelAction(a,{}));retry.disabled=this.#busy||a.busy||!this.client.connected;details.append(retry);}
      if(this.#discardChannelAction===t.path){details.append(element('p',{text:'Discard these retained details? The server may already have applied an unconfirmed action.'}),this.#button('keep-channel-action','Keep details',()=>{this.#discardChannelAction=undefined;this.#render();}),this.#button('confirm-discard-channel-action','Discard details',()=>{
        if(a.busy)return;this.#channelActions.delete(t.path);if(t.kind==='send'){this.#drafts.delete(t.path);this.#attachments.delete(t.path);if(this.#upload?.channel===t.channelId){this.#upload.controller?.abort();this.#upload=undefined;}}this.#discardChannelAction=undefined;this.#render();
      }));}else{const discard=this.#button('discard-channel-action','Discard details',()=>{this.#discardChannelAction=t.path;this.#render();});discard.disabled=this.#busy||a.busy;details.append(discard);}
      panel.append(details);
    }
  }
  #button(action: string, text: string, run: () => void, primary = false): HTMLButtonElement {
    const b = element('button', { type: 'button', text, className: `kl-text-button${primary ? ' kl-text-button--primary' : ''}`, onClick: ()=>{if(b.isConnected&&!this.#destroyed&&this.#visible&&this.options.current())run();} });
    b.dataset.communityAction = action; b.disabled = this.#busy; return b;
  }
  #channelIcon(action: string, label: string, icon: KikiLinkIconName, run: () => void, primary = false): HTMLButtonElement {
    const button = this.#button(action, '', run, primary);
    button.classList.add('kl-browse-icon'); button.title = label; button.setAttribute('aria-label', label);
    button.append(kikiIcon(icon)); return button;
  }
  #ask(text: string, run: () => void): void { this.#confirm = { text, run }; this.#render(); this.element.querySelector<HTMLButtonElement>('[data-community-action="confirm"]')?.focus(); }
  #membershipAction(c:Community,action:'join'|'leave',text:string,description=text+'?',before?:()=>boolean):HTMLButtonElement {
    return this.#button(action,text,()=>{if(!before||before())this.#membership(c,action,text,description);});
  }
  #entryActions(c: Community, before?: () => boolean): HTMLElement[] {
    const membership = (action: 'join' | 'leave', label: string) => this.#membershipAction(c, action, label, undefined, before);
    if (c.membership === 'invited') return [membership('join', 'Accept invitation'), membership('leave', 'Decline invitation')];
    if (c.membership === 'requested') return [element('span', { text: 'Your request is awaiting review.' }), membership('leave', 'Cancel request')];
    if (!c.archived && c.membership !== 'banned' && c.access !== 'private') return [membership('join', c.access === 'request' ? 'Request to join' : 'Join community')];
    return [element('span', { text: c.membership === 'banned' ? 'Your membership is restricted.' : 'An invitation is required to join.' })];
  }
  #contextEntryActions(c: Community, current: () => boolean, close: () => void): HTMLElement[] {
    if (c.membership === 'requested') return [this.#membershipMenu(c, 'context', current)];
    if (c.access === 'public' || c.membership === 'invited' || c.membership === 'banned') return this.#entryActions(c, () => {
      if (!current() || this.#loading) return false;
      close(); return true;
    });

    const source = this.#managementSources.get(c);
    const authorized = () => current() && this.client.connected && !!source?.current();
    const returnAction = `context-membership-${c.id}`;
    const notice = c.access === 'private' ? element('p', { className: 'kl-cm-context-invite-note' }) : undefined;
    notice?.setAttribute('role', 'status');
    const label = notice ? 'Invite only' : 'Request to join';
    const trigger = this.#button(returnAction, label, () => {
      if (!authorized() || this.#loading || this.#busy) return;
      if (notice) notice.textContent = 'This is a private community. Ask a member or administrator for an invitation.';
      else this.#membership(c, 'join', label, 'Request to join?', { authorized, returnAction });
    });
    trigger.classList.add('kl-cm-context-membership');
    if (notice) {
      trigger.prepend(kikiIcon('lock'));
      return [trigger, notice];
    }
    return [trigger];
  }
  #membership(c:Community,action:'join'|'leave'|'invite',title:string,description:string,control?:{authorized?:()=>boolean;returnAction:string}):void {
    if(!this.#valid(this.#token)||this.#loading||this.#busy)return;
    const leaving=action==='leave'&&c.membership==='active';
    if(leaving&&c.role==='owner')return;
    this.#managementAction.open({title:leaving?'Leave this community?':title,description:`${c.name} · ${description}`,communityId:c.id,path:`/v1/communities/${c.id}/${action}`,revision:c.revision,data:{},generation:this.#managementSources.get(c)?.generation,membership:true,memberRequired:action==='invite',
      ...control,
      ...(control?.authorized?{ready:()=>!this.#loading}:{}),
      ...(leaving?{presentation:'leave-community' as const,reviewBody:()=>element('div',{className:'kl-cm-leave-copy'},
        element('p',{},'You will leave ',element('strong',{text:c.name}),'.'),
        element('p',{text:c.access==='private'?'Private content will become unavailable and you will need a new invitation to return.':
          c.access==='request'?'Member content will become unavailable. You will need approval or an invitation to return.':
          'You can still read public content and rejoin later.'}))}:{}),
    });
  }
  #loadingCards(catalog = false): HTMLElement {
    const grid = element('div', { className: `kl-cm-grid kl-cm-loading${catalog ? ' kl-cm-catalog-loading' : ''}`,
      ariaLabel: catalog ? 'Loading communities' : 'Loading community' });
    if (!catalog) grid.setAttribute('role', 'status');
    grid.setAttribute('aria-busy', 'true');
    for (let index = 0; index < (catalog ? 6 : 1); index++) { const card=element('div', { className: 'kl-cm-skeleton-card' },
      element('div', { className: 'kl-cm-skeleton kl-cm-skeleton--avatar' }),
      element('div', { className: catalog ? 'kl-cm-skeleton' : 'kl-cm-skeleton kl-cm-skeleton--medium' }),
      element('div', { className: 'kl-cm-skeleton kl-cm-skeleton--short' }),
      element('div', { className: 'kl-cm-skeleton' }),
      element('div', { className: 'kl-cm-skeleton kl-cm-skeleton--short' })); card.setAttribute('aria-hidden','true'); grid.append(card); }
    return grid;
  }
  #emptyState(icon: KikiLinkIconName, title: string, copy: string): HTMLElement {
    return element('div', { className: 'kl-cm-empty' }, kikiIcon(icon), element('h2', { text: title }), element('p', { text: copy }));
  }
  #render(navigation?: SectionNavigation): void {
    this.#memberMenu.close(); this.#memberMenu.element.remove();
    const active = focusedElement(this.element), focus = active&&this.#content.contains(active)?active:undefined;
    const field = focus?.dataset.communityField, action = focus?.dataset.communityAction;
    const selection = focus instanceof HTMLInputElement || focus instanceof HTMLTextAreaElement ? [focus.selectionStart, focus.selectionEnd] : null;
    const scroll = this.element.scrollTop; this.#mentions.close(); this.#reactions?.destroy(); this.#reactions = undefined;
    const previousList = this.#content.querySelector<HTMLElement>('.kl-cm-channel-rows');
    if (previousList?.dataset.communityId !== this.#selected) this.#channelListScroll = 0;
    else if (previousList?.clientHeight) this.#channelListScroll = previousList.scrollTop;
    const previousMessages = this.#content.querySelector<HTMLElement>('.kl-cm-thread > .kl-cm-messages');
    if (previousMessages?.dataset.channelId && previousMessages.dataset.channelId === this.#channelId && !this.#scrollToChannel && previousMessages.querySelector('.kl-cm-message')) {
      this.#channelScroll = { id: previousMessages.dataset.channelId, top: previousMessages.scrollTop,
        following: previousMessages.scrollHeight - previousMessages.scrollTop - previousMessages.clientHeight <= 12 };
    }
    const optionsWereOpen = this.#channelOptions?.open;
    this.#channelOptions?.close(); this.#channelOptions = undefined;
    this.#channelMenu.close(false); this.#channelMenu.element.remove();
    this.#communityMenu.close(false); this.#communityMenu.element.remove();
    this.#communityCardMenu.close(false); this.#communityCardMenu.element.remove();
    const refresh=iconButton('Refresh','refresh',()=>void this.refresh());refresh.disabled=this.#busy;refresh.dataset.communityAction='refresh';
    const actions = element('div', { className: 'kl-cm-heading-actions' });
    const heading = element('header', { className: 'kl-cm-heading' },
      this.#selected ? null : element('h1', { text: 'Communities' }), actions);
    if (!this.#selected && (this.#supported || this.#directoryLoading)) {
      const invitations = this.#button(this.#directoryEnabled ? 'scope-invites' : 'invites', 'Invitations', () => this.#openInvitations());
      invitations.prepend(kikiIcon('requests'));
      invitations.setAttribute('aria-haspopup', 'dialog');
      invitations.disabled ||= !this.#supported;
      const create = this.#button('create', 'Create community', () => void this.create(), true);
      create.prepend(kikiIcon('plus'));
      create.disabled = this.#busy || this.#creating || !this.#supported;
      actions.append(invitations, create);
    }
    if (this.#selected || !this.#supported && !this.#directoryLoading) actions.append(refresh);
    const content = element('div', { className: 'kl-cm-body' });
    const lockedSection = this.#community && this.#showGuestSections(this.#community) && this.#tab !== 'about';
    this.#content.dataset.view = this.#selected ? lockedSection ? 'access' : this.#tab : 'directory';
    this.#content.replaceChildren(heading, content); this.element.setAttribute('aria-busy', String(this.#loading || this.#busy));
    if (this.#selected) {
      const back = this.#button('back', 'Communities', () => { this.#managementAction.hide();this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#moderation.hide(); this.#audio.pause(); this.#upload?.controller?.abort(); this.#selected = undefined; this.#editorVisible=false;++this.#editEpoch; this.#confirm = undefined; this.#tab='overview';this.#restoreList=true; void this.refresh(); });
      back.setAttribute('aria-label', 'All communities');
      back.prepend(kikiIcon('back'));
      heading.prepend(back);
    }
    if(this.options.current()&&this.#managementAction.unfinished&&!this.#managementAction.visible)content.append(element('section',{className:'kl-mod-notice'},element('p',{text:'An unfinished community action is kept for review.'}),this.#button('review-management','Review unfinished action',()=>this.#managementAction.open())));
    if(this.options.current()&&(this.#communityEditor.unfinished&&!this.#communityEditor.managing||this.#editor?.intent.identity()))content.append(element('section',{className:'kl-mod-notice'},element('p',{text:'An unfinished community draft is kept for review.'}),this.#button('review-editor','Review unfinished draft',()=>this.#reviewEditing())));
    this.#renderChannelAttempts(content);
    if (!this.client.connected || !this.options.current()||!this.#channelIdentity()) { if(this.options.current()&&this.#editor&&this.#editorVisible)this.#renderEditor(content);content.append(element('p', { text: 'Connect to KikiLink Cloud to open Communities.' })); return; }
    const channelDirectoryState = this.#channelDirectoryState();
    if (this.#error && channelDirectoryState !== 'error') content.append(element('p', { className: 'kl-cm-status', text: this.#error }));
    if (this.#loading && !this.#directoryLoading && channelDirectoryState !== 'loading') content.append(element('p', { className: 'kl-cm-status', text: 'Checking access…' }));
    if (this.#creating) content.append(element('p', { className: 'kl-cm-status', text: 'Checking community creation…' }));
    if (!this.#supported && !this.#directoryLoadError && !this.#directoryLoading) { if(this.#editor&&this.#editorVisible)this.#renderEditor(content);if(this.#loading)content.append(this.#loadingCards());else content.append(this.#emptyState('users','Communities are not available yet','Update the Cloud server to enable Communities.')); return; }
    if (this.#confirm) content.append(element('div', { className: 'kl-cm-confirm' }, element('p', { text: this.#confirm.text }), this.#button('confirm', 'Confirm', this.#confirm.run, true), this.#button('cancel-confirm', 'Cancel', () => { this.#confirm = undefined; this.#render(); })));
    if (!this.#selected) this.#renderList(content);
    else if (this.#community) this.#renderCommunity(content, this.#community);
    else if (this.#loading) content.append(this.#loadingCards());
    else {
      const empty = this.#emptyState(this.#error ? 'warning' : 'users', this.#error ? 'Community couldn’t load' : 'Community unavailable', this.#error || 'It may have been removed or your access may have changed.');
      empty.append(this.#button('retry-community', 'Retry', () => void this.refresh(), true)); content.append(empty);
    }
    if (this.#editor&&this.#editorVisible) this.#renderEditor(content);
    const sectionTabs = navigation && navigation.trigger === focus ? content.querySelector<HTMLElement>('.kl-cm-sections') : undefined;
    const section = sectionTabs?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)');
    const restored = field ? this.#content.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-community-field="${field}"]`) : action ? [...this.#content.querySelectorAll<HTMLButtonElement>('[data-community-action]')].find(b => b.dataset.communityAction === action) : undefined;
    if (!section && restored && focus && this.element.contains(restored) && !restored.closest('dialog:not([open])')) { restored.focus({ preventScroll: true }); if (selection && (restored instanceof HTMLInputElement || restored instanceof HTMLTextAreaElement) && ['text','search','textarea'].includes(restored.type)) restored.setSelectionRange(selection[0] ?? null, selection[1] ?? null); }
    else if (!section && optionsWereOpen) this.#content.querySelector<HTMLButtonElement>('[data-community-action="channel-options"]')?.focus({ preventScroll: true });
    else if (!section && action?.startsWith('member-options-')) this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-active"]')?.focus({ preventScroll: true });
    else if (!section && action === 'create-event') this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-events"]')?.focus({ preventScroll: true });
    else if (!section && action === 'create-space') this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-overview"]')?.focus({ preventScroll: true });
    const channelList = this.#content.querySelector<HTMLElement>('.kl-cm-channel-rows');
    if (channelList) channelList.scrollTop = this.#channelListScroll;
    this.element.scrollTop = scroll;
    if (navigation && sectionTabs && section) {
      revealDetailSection(section, sectionTabs, this.element, !this.#loading);
      navigation.trigger = section;
    }
    this.#scheduleRead();
    if (this.#restoreList && !this.#selected && !this.#loading) {
      this.#restoreList = false;
      this.element.scrollTop = this.#listScroll;
      const previousAction = Array.from(this.#content.querySelectorAll<HTMLButtonElement>('[data-community-action]'))
        .find(button => button.dataset.communityAction === this.#listReturnAction);
      (previousAction ?? this.#search).focus({ preventScroll: true });
    }
    if (!this.#loading) {
      const messages = this.#content.querySelector<HTMLElement>('.kl-cm-thread > .kl-cm-messages');
      const target = this.#target && Array.from(messages?.children ?? []).find(node => node instanceof HTMLElement && node.dataset.messageId === this.#target);
      if (messages) {
        const saved = this.#channelScroll?.id === this.#channelId ? this.#channelScroll : undefined;
        messages.scrollTop = !this.#historyBefore && !this.#target && (!saved || saved.following)
          ? messages.scrollHeight : saved?.top ?? 0;
        if (this.#scrollToChannel && target instanceof HTMLElement) messages.scrollTop = Math.max(0, target.offsetTop - messages.offsetTop);
      }
      this.#scrollToChannel = false;
    }
  }
  #openCard(id: string, manage = false, returnAction = `open-${id}`): void {
    this.#listScroll = this.element.scrollTop;
    this.#listReturnAction = returnAction;
    this.open(id);
    this.#management = manage;
    this.#manageOnOpen=manage?id:undefined;
    this.element.scrollTop = 0;
  }
  #openInvitations(): void {
    const current = () => this.#valid(this.#token) && this.client.connected && this.#supported && !this.#selected;
    if (!current() || this.#busy || this.#invitationsOpen) return;
    this.#closeDialog?.();
    const triggerAction = this.#directoryEnabled ? 'scope-invites' : 'invites';
    this.#invitationsOpen = true;
    const close = openCommunityInvitations(this.#overlays, this.client, {
      current,
      dismiss: () => this.#content.querySelector<HTMLButtonElement>(
        '[data-community-action="scope-invites"], [data-community-action="invites"]',
      )?.focus({ preventScroll: true }),
      review: id => {
        this.#openCard(id, false, triggerAction);
        this.#content.querySelector<HTMLButtonElement>('[data-community-action="back"]')?.focus({ preventScroll: true });
      },
      closed: () => {
        this.#invitationsOpen = false;
        if (this.#closeDialog === close) this.#closeDialog = undefined;
      },
    });
    this.#closeDialog = close;
  }
  #openCommunityContext(community?: Community): void {
    const eligible = () => community ? this.#selected === community.id && (this.#tab !== 'channels' || this.#showGuestSections(community)) &&
      this.#community?.id === community.id && this.#community.revision === community.revision &&
      this.#community.membership === community.membership && this.#community.access === community.access && this.#community.role === community.role &&
      this.#community.archived === community.archived &&
      this.#community.restricted === community.restricted : !this.#selected;
    if (!this.#valid(this.#token) || this.#busy || (community && this.#loading) || !eligible() || !this.#supported || this.#contextDrawer) return;
    this.#closeDialog?.();
    const title = community?.name ?? 'Around the community';
    const drawer = element('dialog', { className: 'kl-dialog kl-cm-context-drawer', ariaLabel: title });
    const body = element('div', { className: 'kl-cm-context-body' });
    const current = () => this.#contextDrawer === drawer && drawer.open && drawer.isConnected &&
      this.#valid(this.#token) && eligible() && this.#supported;
    let releaseFit: (() => void) | undefined;
    const close = () => {
      releaseFit?.();
      if (this.#contextDrawer === drawer) {
        this.#communityCardMenu.close(false);
        this.#contextDrawer = undefined;
      }
      if (this.#closeDialog === close) this.#closeDialog = undefined;
      if (drawer.open) drawer.close();
      drawer.remove();
    };
    const dismiss = () => {
      const restoreFocus = current();
      close();
      if (restoreFocus) this.#content.querySelector<HTMLButtonElement>(
        `[data-community-action="${community ? 'detail-context' : 'context'}"]`,
      )?.focus({ preventScroll: true });
    };
    const closeButton = this.#channelIcon('close-context', 'Close dialog', 'close', dismiss);
    const heading = (text: string, accessory?: HTMLElement | SVGElement) =>
      element('header', { className: 'kl-cm-context-section-heading' }, element('h3', { text }), accessory);
    const preview = element('div', { className: 'kl-cm-context-event' },
      element('p', { className: 'kl-cm-context-event-status', text: this.#eventsEnabled ? 'Loading upcoming events…' : 'Events are unavailable.' }));
    preview.dataset.state = this.#eventsEnabled ? 'loading' : 'unavailable';
    preview.setAttribute('aria-live', 'polite');
    const link = (action: string, text: string, run: () => void, icon?: KikiLinkIconName) => {
      const button = this.#button(action, text, () => { if (current()) { close(); run(); } });
      button.classList.add('kl-cm-context-link');
      if (icon) button.append(kikiIcon(icon));
      return button;
    };
    const openSection = (tab: 'active' | 'about') =>
      this.#content.querySelector<HTMLButtonElement>(`.kl-cm-sections [data-community-action="tab-${tab}"]`)?.click();
    const limited = community && (community.membership !== 'active' || community.archived || community.restricted);
    const roster = element('div', { className: 'kl-cm-context-friends' });
    if (community) {
      if (limited) {
        const about = element('section', { className: 'kl-cm-context-about' },
          element('h3', { text: 'About this community' }), element('p', { text: community.description }),
          element('p', { text: community.restricted ? 'This community is restricted by platform moderators.' : community.archived ?
            'This community is archived.' : 'Membership is required to see conversations, members, and community plans.' }));
        if (community.membership !== 'active' && !community.archived && !community.restricted) {
          about.append(element('div', { className: 'kl-cm-actions' }, ...this.#contextEntryActions(community, current, close)));
        }
        body.append(about);
      } else {
        body.append(
          element('section', {}, heading('In this community', kikiIcon('calendar')), preview),
          element('section', { className: 'kl-cm-context-members-section' }, heading('Online now', typeof community.onlineCount === 'number' ?
            element('span', { className: 'kl-cm-context-online', text: `${community.onlineCount} online` }) : undefined),
            roster, link('context-members', 'Explore members', () => openSection('active'), 'arrow-right')),
          element('hr'),
          element('section', { className: 'kl-cm-context-rules-section' }, heading('House rules', kikiIcon('heart', 'kl-icon', true)),
            community.rules.length ? element('ul', {}, ...community.rules.slice(0, 3).map(text => element('li', { text }))) :
              element('p', { className: 'kl-cm-context-empty', text: 'No additional rules.' }),
            link('context-rules', 'Read all community rules', () => openSection('about'))),
        );
      }
    } else {
      const friends = this.options.onlineFriends?.().filter(friend => !this.options.blocked?.(friend.memberNumber)) ?? [];
      const people = this.options.openPeople ? link('context-people', 'Explore people', () => this.options.openPeople?.(), 'arrow-right') : null;
      const refresh = this.#button('context-refresh', 'Refresh communities', () => {
        if (!current()) return;
        dismiss();
        void this.refresh();
      });
      refresh.classList.add('kl-cm-context-link');
      refresh.prepend(kikiIcon('refresh'));
      if (friends.length) this.#contextFaces(roster, friends.map(friend => ({ member:friend.memberNumber, name: friend.memberName })), friends.length);
      body.append(
        element('section', {}, heading('On the horizon', kikiIcon('calendar')), preview),
        element('section', { className: 'kl-cm-context-members-section' }, heading('Familiar faces',
          element('span', { className: 'kl-cm-context-online', text: `${friends.length} online` })), roster, people),
        element('hr'),
        element('section', { className: 'kl-cm-context-rules-section' }, heading('Make yourself at home', kikiIcon('heart', 'kl-icon', true)),
          element('ul', {}, ...['A shared interest is a good start.', 'Find the pace that feels like you.', 'Be kind. Respect each other’s boundaries.']
            .map(text => element('li', { text })))), refresh,
      );
    }
    drawer.append(
      element('header', { className: 'kl-cm-context-header' }, element('div', {},
        element('span', { className: 'kl-cm-context-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })), closeButton),
      body,
    );
    drawer.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    drawer.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
    drawer.addEventListener('close', close);
    drawer.addEventListener('click', event => {
      if (event.target !== drawer) return;
      const bounds = drawer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) dismiss();
    });
    this.#contextDrawer = drawer;
    this.#closeDialog = close;
    this.#overlays.append(drawer);
    drawer.showModal();
    releaseFit = fitPanelDialog(drawer, { layout: () => ({ marginX: 0, marginY: 0 }) });
    closeButton.focus({ preventScroll: true });
    if (limited) return;
    if (this.#eventsEnabled) void this.#loadContextEvent(preview, current, close, community);
    if (community && this.#directoryEnabled) void this.#loadContextMembers(community, roster, current);
  }
  #contextFaces(root: HTMLElement, people: readonly { member:number; name: string; status?:string | undefined; avatar?: HTMLElement | undefined }[], count?: number): void {
    const faces = people.slice(0, 4).map(person => {
      const initials = person.name.trim().split(/\s+/u).slice(0, 2).map(name => Array.from(name)[0]).join('');
      return markAvatarPresence(element('span', { className: 'kl-cm-context-avatar', title: person.name, ariaLabel: person.name },
        person.avatar ?? (initials || '?')), person.member, person.status);
    });
    if (typeof count === 'number' && count > faces.length && faces.length) {
      faces.push(element('span', { className: 'kl-cm-context-avatar kl-cm-context-avatar-more', text: `+${count - faces.length}` }));
    }
    root.replaceChildren(...faces);
  }
  async #loadContextMembers(community: Community, roster: HTMLElement, current: () => boolean): Promise<void> {
    const access = this.#managementSources.get(community);
    if (!access?.current() || !current()) return;
    try {
      const result = await access.request<Page<Member>>('GET',
        `/v1/communities/${encodeURIComponent(community.id)}/members?state=active&online=1&limit=8`);
      if (!current() || !access.current()) return;
      const members = result.items.filter(member => member.state === 'active' && member.profileVisible && member.displayName &&
        member.status && member.status !== 'unavailable' && !this.options.blocked?.(member.memberNumber) &&
        !this.client.isProfileBlocked?.(member.memberNumber)).slice(0, 4);
      this.#contextFaces(roster, members.map(member => ({ member:member.memberNumber, status:member.status, name: member.displayName!,
        avatar: member.avatarId ? this.options.avatar?.(member.avatarId, member.memberNumber === this.#channelOwner) : undefined })),
        community.onlineCount ?? undefined);
    } catch {
      if (current() && access.current()) roster.replaceChildren(element('p', { className: 'kl-cm-context-empty', text: 'Online members couldn’t load.' }));
    }
  }
  async #loadContextEvent(preview: HTMLElement, current: () => boolean, close: () => void, community?: Community): Promise<void> {
    const status = (state: 'empty' | 'more' | 'unavailable' | 'error', text: string) => {
      preview.dataset.state = state;
      preview.replaceChildren(element('p', { className: 'kl-cm-context-event-status', text }));
    };
    try {
      const me = await this.client.request<{memberNumber?:number;features?:{communities?:boolean;eventsRsvp?:boolean;eventDiscovery?:boolean}}>('GET', '/v1/me');
      if (!current()) return;
      if (me.memberNumber !== undefined && me.memberNumber !== this.#channelOwner || me.features?.communities !== true) { close(); return; }
      if (!me.features.eventsRsvp) { status('unavailable', 'Events are unavailable.'); return; }
      const path = me.features.eventDiscovery ? '/v1/calendar/discover' : '/v1/calendar/events';
      const scope = community ? `&communityId=${encodeURIComponent(community.id)}&limit=3` : '&limit=20';
      const page = await calendarRead(this.client, me).request<{items:DirectoryEvent[];nextCursor:string|null}>(
        `${path}?scope=all&when=upcoming&status=scheduled${scope}`,
      );
      if (!current()) return;
      const event = page.items.find(item => (community ? item.communityId === community.id : item.communityId && item.communityName) && !item.archived &&
        item.status === 'scheduled' && Number.isFinite(item.startsAt) && item.endsAt > Date.now());
      if (!event?.communityId) {
        if (page.nextCursor) status('more', 'More events are available in Events.');
        else status('empty', 'A little breathing room. No upcoming events.');
        return;
      }
      const communityId = event.communityId;
      const date = new Date(event.startsAt);
      const open = this.options.openEvent || this.options.openEvents ? this.#button('context-event', 'View event', () => {
        if (!current()) return;
        close();
        if (this.options.openEvent) this.options.openEvent(event.id, communityId);
        else this.options.openEvents?.(communityId);
      }) : null;
      open?.append(kikiIcon('arrow-right'));
      const dateBadge = element('span', { className: 'kl-cm-context-date' }, element('strong', { text: String(date.getDate()) }),
        element('span', { text: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date) }));
      preview.dataset.state = 'event';
      preview.replaceChildren(
        element('span', { className: 'kl-cm-context-eyebrow', text: community ? 'NEXT EVENT' : event.communityName! }),
        element('div', { className: 'kl-cm-context-event-row' }, dateBadge,
          element('div', { className: 'kl-cm-context-event-copy' }, element('h4', { text: event.title }),
            element('p', { className: 'kl-cm-context-event-time', text: `${formatClockTime(event.startsAt)} · ${localZone(event.startsAt)}` }))),
        element('p', { className: 'kl-cm-context-event-description', text: event.description }), ...(open ? [open] : []),
      );
    } catch {
      if (current()) status('error', 'Upcoming events couldn’t load.');
    }
  }
  #renderList(root: HTMLElement): void {
    const checkingCapability = this.#directoryLoading && !this.#supported;
    const directoryControls = this.#directoryEnabled || checkingCapability;
    this.#filters.set({access:this.#scope==='mine'?'mine':this.#listAccess,language:this.#listLanguage,active:this.#activeOnly,events:this.#withEvents},
      this.#directoryLoadError || this.#directoryLoading ? '' : `${this.#list.length}${this.#cursor !== null ? '+' : ''} ${this.#list.length === 1 ? 'community shown' : 'communities shown'}`);
    this.#filters.button.disabled=this.#busy;this.#search.disabled=this.#busy;
    const clearSearch = this.#searchBox.querySelector('button');
    if (clearSearch) clearSearch.disabled = checkingCapability;
    const context = this.#channelIcon('context', 'Community context', 'info', () => this.#openCommunityContext());
    context.setAttribute('aria-haspopup', 'dialog');
    root.append(element('div',{className:'kl-cm-search'},this.#searchBox,this.#filters.button,context));
    const tabs = element('nav', { className: 'kl-cm-tabs', ariaLabel: directoryControls ? 'Community visibility' : 'Community lists' });
    if(directoryControls){
      for(const [scope,access,label] of [['all','','All'],['mine','','My communities'],['all','public','Public'],['all','request','Request only'],['all','private','Private'],['all','archived','Archived']]){
        const b=this.#button(`scope-${access||scope}`,label!,()=>{this.#scope=scope!;this.#listAccess=access!;this.#list=[];void this.refresh();});b.setAttribute('aria-pressed',String((checkingCapability && !this.#directoryEnabled ? 'all' : this.#scope)===scope&&this.#listAccess===access));tabs.append(b);
        if (scope === 'mine') b.prepend(kikiIcon('check'));
      }
      const sort=element('select',{ariaLabel:'Sort communities'});sort.dataset.communityField='directory-sort';
      for(const[value,text]of [['recommended','Recommended'],['active','Active'],['members','Members'],['newest','Newest']]){const o=element('option',{text:text!});o.value=value!;sort.append(o);}sort.value=this.#sort;sort.disabled=this.#busy;sort.addEventListener('change',()=>{this.#sort=sort.value;this.#list=[];void this.refresh();});
      root.append(element('div', { className: 'kl-cm-list-controls' }, tabs,
        element('label', { className: 'kl-cm-sort' }, 'Sort by', sort)));
      root.append(element('div', { className: 'kl-cm-quick-filters', ariaLabel: 'Quick community filters' }, ...(['active','events'] as const).map(kind=>{
        const b=this.#button(`filter-${kind}`,kind==='active'?'Active now':'Upcoming events',()=>{if(kind==='active')this.#activeOnly=this.#activeOnly==='1'?'0':'1';else this.#withEvents=this.#withEvents==='1'?'0':'1';this.#list=[];void this.refresh();});b.setAttribute('aria-pressed',String((kind==='active'?this.#activeOnly:this.#withEvents)==='1'));if(kind==='active')b.title='More than 5 members online';
        b.prepend(kikiIcon(kind==='active'?'users':'calendar'));
        if (b.getAttribute('aria-pressed') === 'true') b.append(kikiIcon('check'));
        return b;
      })));
    }else{
    for (const scope of ['mine','discover']) { const b = this.#button(scope, labels[scope] ?? scope, () => { this.#scope = scope; this.#list = [];this.#cursor=null; void this.refresh(); }); b.setAttribute('aria-pressed', String(this.#scope === scope)); tabs.append(b); }
    root.append(tabs);
    }
    const filtered = !!(this.#search.value || this.#listAccess || this.#listLanguage || this.#activeOnly === '1' || this.#withEvents === '1' || this.#directoryEnabled && this.#scope === 'mine');
    const reset = () => {
      clearTimeout(this.#searchTimer);
      this.#search.value = ''; this.#listAccess = ''; this.#listLanguage = '';
      if (this.#directoryEnabled) { this.#scope = 'all'; this.#sort = 'recommended'; }
      this.#activeOnly = '0'; this.#withEvents = '0'; this.#list = [];
      void this.refresh();
    };
    if (filtered) {
      const selected = element('div', { className: 'kl-cm-active-filters', ariaLabel: 'Selected filters' });
      const add = (key: string, label: string, clear: () => void) => {
        const button = this.#button(`remove-filter-${key}`, '', () => { clear(); this.#list = []; void this.refresh(); });
        button.setAttribute('aria-label', `Remove ${label} filter`);
        button.append(element('span', { text: label }), kikiIcon('close')); selected.append(button);
      };
      if (this.#activeOnly === '1') add('active', 'Active now', () => { this.#activeOnly = '0'; });
      if (this.#withEvents === '1') add('events', 'Upcoming events', () => { this.#withEvents = '0'; });
      if (this.#listLanguage) add('language', this.#listLanguage, () => { this.#listLanguage = ''; });
      selected.append(this.#button('clear-filters', 'Clear all', () => { reset(); this.#search.focus({ preventScroll: true }); }));
      root.append(selected);
    }
    if (this.#directoryLoading) {
      if (checkingCapability) root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
        ':scope > :is(.kl-cm-search, .kl-cm-list-controls, .kl-cm-quick-filters, .kl-cm-active-filters) :is(button, input, select)',
      ).forEach(control => { control.disabled = true; });
      const summary = element('div', { className: 'kl-browse-summary kl-cm-catalog-summary', text: 'Finding your next community…' });
      summary.setAttribute('role', 'status');
      root.append(summary, this.#loadingCards(true));
      return;
    }
    if (this.#list.length) {
      const summary = element('div',{className:'kl-browse-summary',text:`${this.#list.length}${this.#cursor!==null?'+':''} ${this.#list.length===1?'community':'communities'}${this.#cursor!==null?' · more available':''}`});
      summary.setAttribute('role', 'status');
      root.append(summary);
    }
    if (this.#list.length) root.append(element('div', { className: 'kl-cm-grid' }, ...this.#list.map(c => this.#card(c))));
    else if (this.#directoryLoadError) {
      const error = this.#emptyState('offline', 'We couldn’t load communities', this.#directoryLoadError);
      error.classList.add('kl-explore-empty', 'kl-cm-directory-error');
      error.setAttribute('role', 'alert');
      const retry = this.#button('retry-list', 'Retry', () => {
        if (focusedElement(this.element) === retry) this.#search.focus({ preventScroll: true });
        void this.refresh();
      }, true);
      retry.prepend(kikiIcon('refresh'));
      error.append(retry);
      root.append(error);
    }
    else {
      const empty=this.#emptyState(filtered?'search':'users',filtered?'No communities found':'No communities yet',filtered?'Try a different name or clear your filters to find your people.':this.#scope==='mine'?'Find your people in Discover, or create a community.':'Communities shared with you will appear here.');
      if(filtered){
        empty.classList.add('kl-explore-empty');
        empty.append(this.#button('reset-list','Reset filters',()=>{reset();this.#search.focus({preventScroll:true});},true));
      }
      root.append(empty);
    }
    if (this.#cursor !== null) root.append(this.#button('more', 'More communities', () => void this.refresh(true)));
  }
  #card(c: Community): HTMLElement {
    const title = this.#button(`title-${c.id}`, c.name, () => this.#openCard(c.id));
    title.title = c.name;
    const detail = this.#button(`open-${c.id}`, c.membership === 'invited' ? 'Review invitation' : 'Details', () => this.#openCard(c.id));
    detail.classList.add('kl-cm-card-details');
    detail.append(kikiIcon('arrow-right'));
    detail.setAttribute('aria-label', c.membership === 'invited' ? `Review invitation to ${c.name}` : `View ${c.name} details`);
    const actions = element('div', { className: 'kl-cm-card-actions' });
    if (c.archived || c.restricted) actions.append(element('span', { className: 'kl-cm-membership' }, kikiIcon('lock'), c.restricted ? 'Restricted' : 'Archived'));
    else if (c.membership === 'active') actions.append(element('span', { className: 'kl-cm-membership kl-cm-membership--joined' }, kikiIcon('check'), 'Joined'));
    else if (c.membership === 'requested') actions.append(this.#membershipMenu(c, 'catalog'));
    else if (c.membership !== 'invited' && c.membership !== 'banned') {
      if (c.access === 'private') actions.append(element('span', { className: 'kl-cm-membership' }, kikiIcon('lock'), 'Invite only'));
      else {
        const label = c.access === 'request' ? 'Request to join' : 'Join';
        const join = this.#button(`join-${c.id}`, label, () => this.#membership(c, 'join', label, `${label}?`), true);
        if (c.access === 'public') join.prepend(kikiIcon('plus'));
        actions.append(join);
      }
    }
    actions.append(detail);
    const events = this.#directoryEnabled && typeof c.upcomingEvents === 'number'
      ? element('span', { className: 'kl-cm-event-hint', title: 'Upcoming events' }, kikiIcon(c.upcomingEvents ? 'calendar' : 'clock'),
        c.upcomingEvents ? `${c.upcomingEvents} ${c.upcomingEvents === 1 ? 'event' : 'events'}` : 'No events')
      : null;
    const menu = this.#directoryEnabled ? this.#communityOptions(c, true) : null;
    return element('article', { className: 'kl-cm-card' + (c.archived ? ' kl-cm-card--archived' : '') },
      element('div', { className: 'kl-cm-card-top' }, communityIcon(c), element('div', { className: 'kl-cm-card-name' },
        element('h2', {}, title),
        element('span', { className: 'kl-cm-visibility' }, this.#visibility(c), c.role && c.role !== 'member'
            ? element('span', { className: 'kl-cm-staff', title: roles[c.role], ariaLabel: roles[c.role] }, kikiIcon('shield'))
            : null)), menu),
      element('p', { className: 'kl-cm-card-description', text: c.description }), communityTags(c.tags?.slice(0, 3)),
      element('div', { className: 'kl-cm-card-facts' }, this.#memberCount(c), this.#presence(c), element('span', { text: c.language })),
      element('footer', { className: 'kl-cm-card-footer' }, events, actions));
  }
  #membershipMenu(c: Community, surface: 'catalog' | 'detail' | 'context', contextCurrent?: () => boolean): HTMLButtonElement {
    const requested = c.membership === 'requested';
    const source = this.#managementSources.get(c);
    const returnAction = `${surface === 'context' ? 'context-' : ''}membership-${c.id}`;
    const authorized = () => {
      const row = surface === 'catalog' ? !this.#selected && this.#list.find(item => item.id === c.id) : this.#selected === c.id && this.#community;
      return this.#valid(this.#token) && this.client.connected && !!source?.current() && !!row && row.id === c.id &&
        row.revision === c.revision && row.membership === c.membership && row.role === c.role && !row.archived && !row.restricted &&
        (contextCurrent?.() ?? true);
    };
    const trigger = this.#button(returnAction, requested ? 'Requested' : 'Joined', () => {
      const current = () => trigger.isConnected && authorized() && !this.#loading && !this.#busy;
      if (!current()) return;
      const leave = (label: string, description: string) => this.#membership(c, 'leave', label, description, { authorized, returnAction });
      const actions: ShellAction[] = requested
        ? [{ label: 'Cancel request', icon: 'close', run: () => leave('Cancel request', 'Cancel your request to join?') }]
        : [{ label: 'View community', icon: 'users', run: () => { if (this.#tab !== 'overview') this.#switchTab('overview'); } }];
      if (!requested) {
        const community = this.#community!;
        const manager = this.#customizationEnabled && this.#canOpenManager(community);
        const owner = manager && this.#canOwnCommunity(community);
        if (manager || !this.#customizationEnabled && (community.canReview || community.canInvite)) {
          actions.push({ label: owner ? 'Ownership and membership' : 'Community management', icon: 'settings', run: () => {
            const latest = this.#community;
            if (!latest || latest.id !== c.id) return;
            if (this.#customizationEnabled && this.#canOpenManager(latest))
              this.#editCommunity(latest,undefined,'name',returnAction,this.#canOwnCommunity(latest)?'ownership':'members');
            else if (!this.#customizationEnabled && (latest.canReview || latest.canInvite)) { this.#management = true; this.#render(); }
          } });
        }
        if (c.role !== 'owner') actions.push({ label: 'Leave community', icon: 'logout',
          run: () => leave('Leave community', 'Leave this community? Access to its channels will end.') });
      }
      const menu = this.#communityCardMenu;
      menu.element.classList.add('kl-cm-membership-menu', 'kl-explore-membership-menu');
      this.#overlays.append(menu.element);
      menu.open(trigger, requested ? 'Request pending' : 'Membership', actions.map(action => ({
        ...action, run: () => { if (current()) action.run(); },
      })), requested ? 'The community team will review your request.' : undefined, false, requested);
      if (requested) menu.element.setAttribute('aria-label', 'Join request');
    });
    trigger.classList.add('kl-cm-membership-trigger', `kl-cm-${surface === 'catalog' ? 'card' : surface}-membership`);
    trigger.classList.toggle('kl-cm-membership-trigger--joined', !requested);
    trigger.prepend(kikiIcon(requested ? 'clock' : 'check'));
    if (!requested) trigger.append(kikiIcon('chevron-down'));
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.disabled ||= this.#loading;
    return trigger;
  }
  #communityOptions(c: Community, directory: boolean): HTMLButtonElement {
    const label = directory ? `More options for ${c.name}` : 'Community options';
    const trigger = iconButton(label, 'more', () => {
      const source = this.#managementSources.get(c);
      const currentCommunity = () => {
        if (!this.#valid(this.#token) || !this.client.connected) return undefined;
        if (directory) return !this.#selected ? c : undefined;
        const latest = this.#community;
        return this.#selected === c.id && source?.current() && latest?.id === c.id && latest.revision === c.revision &&
          latest.membership === c.membership && latest.role === c.role && latest.archived === c.archived && latest.restricted === c.restricted
          ? latest : undefined;
      };
      const ready = () => trigger.isConnected && !this.#loading && !this.#busy;
      const community = currentCommunity();
      if (!ready() || !community) return;
      const actions: ShellAction[] = [
        { label: 'Open community', icon: 'users', run: () => {
          if (directory) this.#openCard(c.id);
          else if (this.#tab !== 'overview') this.#switchTab('overview');
        } },
        { label: 'Share community', icon: 'copy', run: () => this.#shareCommunity(community, trigger) },
      ];
      const canManage = (row: Community) => row.membership === 'active' && !row.restricted &&
        (row.archived ? this.#customizationEnabled && this.#canOwnCommunity(row) : row.canReview || row.canInvite);
      if (canManage(community)) {
        actions.push({ label: 'Manage community', icon: 'settings', run: () => {
          const latest = currentCommunity();
          if (!latest || !canManage(latest)) return;
          if (directory) this.#openCard(c.id, true);
          else if(this.#customizationEnabled&&this.#canOpenManager(latest))this.#editCommunity(latest,undefined,'name','community-options');
          else { this.#management = true; this.#render(); }
        } });
      }
      const active = (row: Community) => row.membership === 'active' && !row.archived && !row.restricted;
      const invite = (row: Community) => active(row) && row.canInvite;
      const leave = (row: Community) => active(row) && row.role !== 'owner';
      const membership = (action: 'invite' | 'leave', title: string, copy: string, eligible: (row: Community) => boolean) => {
        const authorized = () => {
          const latest = currentCommunity();
          return !!latest && eligible(latest);
        };
        const control = directory ? action === 'leave' ? { returnAction: `options-${c.id}` } : undefined : { authorized, returnAction: 'community-options' };
        if (authorized()) this.#membership(community, action, title, copy, control);
      };
      if (invite(community)) {
        actions.push({ label: 'Invite a person', icon: 'plus', run: () => membership('invite', 'Invite a person', 'Invite a member to this community?', invite) });
      }
      if (leave(community)) {
        actions.push({ label: 'Leave community', icon: directory ? 'external' : 'logout',
          run: () => membership('leave', 'Leave community', 'Leave this community? Access to its channels will end.', leave) });
      }
      if (this.#directoryEnabled && this.#reportSources.get(community)?.current()) {
        actions.push({ label: 'Report community', icon: 'flag', run: () => this.#reportCommunity(community) });
      }
      const menu = directory ? this.#communityCardMenu : this.#communityMenu;
      menu.element.classList.remove('kl-cm-membership-menu', 'kl-explore-membership-menu');
      menu.element.classList.toggle('kl-explore-detail-options', !directory);
      this.#overlays.append(menu.element);
      menu.open(trigger, `${c.name} options`, actions.map(action => ({
        ...action, run: () => { if (ready() && currentCommunity()) action.run(); },
      })), undefined, false, false);
    });
    trigger.classList.add('kl-cm-more');
    trigger.dataset.communityAction = directory ? `options-${c.id}` : 'community-options';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.disabled = this.#busy || this.#loading;
    return trigger;
  }
  #shareCommunity(community: Community, opener: HTMLButtonElement): void {
    let link: string;
    try { link = communityShareUrl(location.href, community.id, this.client.origin); }
    catch { this.#error = 'The community link could not be created.'; this.#render(); return; }
    const {dialog, close} = this.#dialog('Share community');
    dialog.classList.remove('kl-cm-dialog');
    dialog.classList.add('kl-cm-share-dialog', 'kl-explore-share-dialog');
    const input = element('input', { ariaLabel: 'Community link' });
    input.value = link; input.readOnly = true;
    const status = element('p'); status.setAttribute('role', 'status');
    const copy = this.#button('copy-community-link', 'Copy community link', () => {
      const current = () => opener.isConnected && input.isConnected && dialog.open && this.#valid(this.#token) && this.client.connected;
      if (!current()) return;
      const fallback = () => {
        if (!current()) return;
        status.textContent = 'Select and copy the link.';
        input.focus(); input.select();
      };
      if (!navigator.clipboard) { fallback(); return; }
      void navigator.clipboard.writeText(link).then(() => { if (current()) status.textContent = 'Link copied.'; }).catch(fallback);
    }, true);
    dialog.replaceChildren(
      element('header', { className: 'kl-explore-share-heading' },
        element('div', {}, element('span', { className: 'kl-explore-share-eyebrow', text: 'KIKILINK' }), element('h2', { text: 'Share community' })),
        iconButton('Close dialog', 'close', close)),
      element('div', { className: 'kl-explore-share-body' },
        element('p', { text: 'This link opens the community in KikiLink on the same Cloud.' }),
        element('label', {}, element('span', { text: 'Community link' }), input), status),
      element('footer', { className: 'kl-explore-share-footer' }, this.#button('close-community-share', 'Close', close), copy),
    );
    dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    dialog.addEventListener('close', () => {
      if (opener.isConnected && this.#valid(this.#token)) opener.focus({ preventScroll: true });
    }, { once: true });
    dialog.showModal();
    fitPanelDialog(dialog);
    input.focus({ preventScroll: true });
    input.select();
  }
  #visibility(c: Community): HTMLElement {
    const text = c.access === 'request' ? 'Request only' : c.access === 'private' ? 'Private' : 'Public';
    return element('span', { className: 'kl-cm-access' },
      kikiIcon(c.access === 'public' ? 'globe' : c.access === 'private' ? 'lock' : 'shield'), text, c.archived ? ' · Archived' : null);
  }
  #memberCount(c: Community): HTMLElement {
    return element('span', {}, kikiIcon('users'), `${c.memberCount} ${c.memberCount === 1 ? 'member' : 'members'}`);
  }
  #presence(c: Community): HTMLElement | null {
    if (!this.#directoryEnabled || typeof c.onlineCount !== 'number') return null;
    return element('span', { className: c.onlineCount ? 'kl-cm-card-online' : 'kl-cm-card-online kl-cm-card-online--quiet' }, `${c.onlineCount} online`);
  }
  #switchTab(tab: string, navigation?: SectionNavigation): void {
    clearTimeout(this.#memberTimer);
    if (tab !== this.#tab) this.#memberOnline = '0';
    this.#moderation.hide(); this.#tab = tab; this.#cursor = null;
    if (tab === 'channels') { this.#selectChannel(undefined, navigation); return; }
    this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.();
    this.#audio.pause(); this.#editorVisible = false; ++this.#editEpoch; void this.refresh(false, false, navigation);
  }
  #canCreateEvent(c: Community): boolean {
    return this.#eventsEnabled && c.membership === 'active' && (c.role === 'owner' || c.role === 'admin') &&
      c.canManage && !c.archived && !c.restricted;
  }
  #createEventButton(c: Community): HTMLButtonElement {
    const create = this.#button('create-event', 'Create event', () => {
      const current = this.#community;
      if (!this.#valid(this.#token) || this.#loading || this.#busy || this.#selected !== c.id || this.#tab !== 'events' ||
          current?.id !== c.id || !this.#canCreateEvent(current) || !this.#managementSources.get(current)?.current()) return;
      this.options.createEvent?.(current.id, () => {
        if (!this.#valid(this.#token) || this.#selected !== c.id || this.#tab !== 'events') return;
        const opener = this.#content.querySelector<HTMLButtonElement>('[data-community-action="create-event"]');
        (opener ?? this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-events"]'))?.focus({ preventScroll: true });
      });
    });
    create.prepend(kikiIcon('plus'));
    create.classList.add('kl-cm-create-event');
    create.setAttribute('aria-haspopup', 'dialog');
    if (this.#loading) create.setAttribute('aria-disabled', 'true');
    return create;
  }
  #previewEvents(root: HTMLElement, c: Community, overview = false): void {
    const all = this.#button('events', 'All events', () => {
      if (this.options.openEvents) this.options.openEvents(c.id);
      else this.#switchTab('events');
    });
    all.classList.add('kl-cm-subtle');
    const browse = overview || this.options.openEvents ? all : null;
    const actions = !overview && this.options.createEvent && this.#canCreateEvent(c)
      ? element('div', { className: 'kl-cm-event-preview-actions' }, browse, this.#createEventButton(c))
      : browse;
    const panel = element('section', { className: 'kl-cm-panel kl-cm-event-preview' },
      element('header', {}, element('h2', { text: overview ? 'Next event' : 'Upcoming events' }), actions));
    for (const event of overview ? this.#events.slice(0, 1) : this.#events) {
      const date = new Date(event.startsAt);
      const dateBadge = element('span', { className: 'kl-ev-datebox' },
        element('span', { text: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date) }),
        element('strong', { text: String(date.getDate()) }),
        element('small', { text: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date) }));
      dateBadge.setAttribute('aria-hidden', 'true');
      const open = () => this.options.openEvent ? this.options.openEvent(event.id, c.id) : this.options.openEvents?.(c.id);
      const canOpen = this.options.openEvent || this.options.openEvents;
      const title = canOpen ? this.#button(`event-${event.id}`, event.title, open) : element('span', { text: event.title });
      title.classList.replace('kl-text-button', 'kl-ev-title');
      const details = canOpen ? this.#button(`event-details-${event.id}`, 'View event', open) : null;
      details?.append(kikiIcon('arrow-right'));
      const visibility = event.visibility === 'public' ? 'Public' : event.visibility === 'members' ? 'Members only' : undefined;
      const attendance = Number.isFinite(event.going) ? (event.capacity > 0 ? `${event.going}/${event.capacity} going` : `${event.going} going`) : undefined;
      const status = event.status === 'cancelled' ? element('span', { className: 'kl-ev-badge', text: 'Cancelled' }) : null;
      if (status) status.dataset.tone = 'danger';
      panel.append(element('article', { className: 'kl-ev-card kl-cm-event-card' },
        dateBadge, element('h3', {}, title), element('div', { className: 'kl-ev-host-line', text: c.name }),
        event.category || visibility ? element('div', { className: 'kl-ev-card-category kl-ev-meta' },
          event.category ? element('span', { text: event.category }) : null,
          visibility ? element('span', { className: 'kl-ev-visibility' }, kikiIcon(event.visibility === 'public' ? 'globe' : 'lock'), visibility) : null) : null,
        element('p', { className: 'kl-ev-description', text: event.description }),
        element('div', { className: 'kl-ev-card-facts kl-ev-meta' },
          element('span', {}, kikiIcon('clock'), eventRange(event.startsAt, event.endsAt)),
          attendance ? element('span', {}, kikiIcon('users'), attendance) : null,
          event.language ? element('span', {}, kikiIcon('globe'), event.language) : null),
        element('div', { className: 'kl-ev-tags' }, status,
          ...(event.tags ?? []).slice(0, 2).map(tag => element('span', { className: 'kl-ev-tag', text: tag }))),
        details ? element('footer', { className: 'kl-ev-actions' }, details) : null));
    }
    if (!this.#events.length) panel.append(element('div', { className: 'kl-cm-preview-empty' },
      element('h3', { text: this.#loading ? 'Loading events…' : this.#previewError ? 'Events could not load.' : 'No upcoming events' }),
      !this.#loading && !this.#previewError ? element('p', { text: 'The next gathering will appear here.' }) : null));
    root.append(panel);
  }
  #canCreateSpace(c: Community): boolean {
    return this.#spacesEnabled && c.membership === 'active' && (c.role === 'owner' || c.role === 'admin') &&
      c.canManage && !c.archived && !c.restricted;
  }
  async #loadSpacePreview(c: Community, metadata: unknown, token: number): Promise<{ items: PreviewSpace[]; empty: boolean }> {
    const read = spaceRead(this.client, metadata).request;
    const listed = await read<{ items: PreviewSpace[] }>(`/v1/spaces?scope=all&communityId=${c.id}&limit=3`);
    if (listed.items.length || !this.#valid(token) || !this.options.createSpace || !this.#canCreateSpace(c)) return { items: listed.items, empty: false };

    // The public preview omits unlisted and archived Spaces, including for managers.
    const linked = await read<Page<PreviewSpace>>(`/v1/spaces?scope=mine&communityId=${c.id}&limit=1`);
    return { items: listed.items, empty: linked.items.length === 0 && linked.nextCursor == null };
  }
  #createSpaceButton(c: Community): HTMLButtonElement {
    const create = this.#button('create-space', 'Create Space', () => {
      const current = this.#community;
      if (!this.#valid(this.#token) || !this.client.connected || this.#loading || this.#busy || this.#error ||
          this.#spacePreview !== 'empty' || this.#selected !== c.id || this.#tab !== 'overview' ||
          current?.id !== c.id || !this.#canCreateSpace(current) || !this.#managementSources.get(current)?.current()) return;
      this.options.createSpace?.(current.id, () => {
        if (!this.#valid(this.#token) || this.#selected !== c.id || this.#tab !== 'overview') return;
        const opener = this.#content.querySelector<HTMLButtonElement>('[data-community-action="create-space"]');
        (opener ?? this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-overview"]'))?.focus({ preventScroll: true });
      });
    });
    create.classList.add('kl-cm-create-space');
    create.setAttribute('aria-haspopup', 'dialog');
    if (this.#loading) create.setAttribute('aria-disabled', 'true');
    return create;
  }
  #renderOverview(root: HTMLElement, c: Community): void {
    const overview = element('div', { className: 'kl-cm-overview-content' });
    if (this.#customizationEnabled && typeof c.announcement === 'string') {
      const header = element('header', {}, element('h2', {}, kikiIcon('pin'), 'Announcement'));
      if (c.canManage && !c.archived) {
        const edit = this.#button('edit-announcement', 'Edit', () => this.#editCommunity(c, undefined, 'announcement'));
        edit.classList.add('kl-cm-subtle'); header.append(edit);
      }
      overview.append(element('section', { className: 'kl-cm-panel kl-cm-announcement' }, header,
        element('p', { className: 'kl-cm-announcement-copy', text: c.announcement || 'No announcement yet.' })));
    }
    if (this.#previewError) overview.append(element('div', { className: 'kl-cm-status' },
      element('span', { text: this.#previewError }), this.#button('retry-previews', 'Retry', () => void this.refresh())));
    const members = this.#button('overview-members', 'View members', () => this.#openSection('active', members));
    members.classList.add('kl-cm-subtle');
    overview.append(element('div', { className: 'kl-cm-pulse' },
      typeof c.onlineCount === 'number' ? element('span', { className: c.onlineCount ? 'kl-cm-pulse-online kl-cm-card-online' : 'kl-cm-pulse-online kl-cm-card-online kl-cm-card-online--quiet' }, element('strong', { text: String(c.onlineCount) }), ' online') : null,
      members,
      this.#eventsEnabled && typeof c.upcomingEvents === 'number' ? element('span', { className: 'kl-cm-pulse-events' },
        kikiIcon('calendar'), `${c.upcomingEvents} upcoming ${c.upcomingEvents === 1 ? 'event' : 'events'}`) : null));
    const main = element('div', { className: 'kl-cm-overview-main' });
    const side = element('aside', { className: 'kl-cm-overview-side', ariaLabel: 'Community information' });
    if (this.#eventsEnabled) this.#previewEvents(main, c, true);
    const openChannels = this.#button('overview-channels', 'Open channels', () => this.#openSection('channels', openChannels));
    openChannels.classList.add('kl-cm-subtle');
    const channels = element('section', { className: 'kl-cm-panel' },
      element('header', {}, element('h2', { text: 'Conversations' }), openChannels));
    for (const channel of this.#channels.slice(0, 3)) {
      const open = this.#button(`preview-channel-${channel.id}`, '', () => { this.#tab = 'channels'; this.#selectChannel(channel.id); });
      open.classList.add('kl-cm-overview-channel');
      open.append(kikiIcon('chat'), element('span', {}, element('strong', { text: `# ${channel.name}` }),
        channel.topic ? element('small', { text: channel.topic }) : null));
      if (channel.unread) open.append(element('span', { className: 'kl-cm-channel-unread', text: String(channel.unread), ariaLabel: `${channel.unread} unread` }));
      channels.append(open);
    }
    if (!this.#channels.length) channels.append(element('div', { className: 'kl-cm-preview-empty' },
      element('h3', { text: 'No channels available' }),
      element('p', { text: c.canManage ? 'Open channels to create one.' : 'Only channels you can access are shown.' })));
    main.append(channels);
    if (this.#spacesEnabled) {
      const all = this.#button('spaces', 'All spaces', () => this.options.openSpaces?.(c.id));
      all.classList.add('kl-cm-subtle');
      const spaces = element('section', { className: 'kl-cm-panel' },
        element('header', {}, element('h2', { text: 'Community Spaces' }), this.options.openSpaces ? all : null));
      for (const space of this.#spaces) {
        const open = this.#button(`space-${space.id}`, space.name, () => this.options.openSpace ? this.options.openSpace(space.id, c.id) : this.options.openSpaces?.(c.id));
        spaces.append(element('article', { className: 'kl-cm-preview-row' },
          element('span', { className: 'kl-cm-space-icon' }, kikiIcon('location')),
          element('div', {}, open, element('small', { text: space.canRead ? 'View space' : 'Review access' }), element('p', { text: space.description }))));
      }
      if (!this.#spaces.length) {
        const empty = this.#spacePreview === 'empty';
        const text = this.#loading ? 'Loading spaces…' : this.#spacePreview === 'error' ? 'Spaces could not load.' :
          empty ? 'No linked Space yet.' : 'No listed spaces yet.';
        spaces.append(element('p', { className: 'kl-cm-meta', text }));
        if (empty && !this.#error && this.options.createSpace && this.#canCreateSpace(c)) spaces.append(this.#createSpaceButton(c));
      }
      side.append(spaces);
    }
    if (c.rules.length) {
      const rules = this.#button('overview-about', 'Read all rules', () => this.#openSection('about', rules));
      rules.classList.add('kl-cm-subtle');
      side.append(element('section', { className: 'kl-cm-panel' }, element('h2', { text: 'House rules' }),
        element('ol', {}, ...c.rules.slice(0, 3).map(rule => element('li', { text: rule }))), rules));
    }
    overview.append(element('div', { className: 'kl-cm-overview-grid' }, main, side.childElementCount ? side : null));
    root.append(overview);
  }
  #renderAbout(root:HTMLElement,c:Community):void {
    const facts=element('dl',{className:'kl-cm-facts'});
    const visibility = c.access === 'request' ? 'Request only' : c.access === 'private' ? 'Private' : 'Public';
    const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined;
    for (const [label, value] of [['Visibility', visibility], ['Primary language', c.language], ['Created', created], ['Discoverable', c.discoverable ? 'Yes' : 'No · invitation only']]) {
      if (value !== undefined) facts.append(element('dt', { text: label! }), element('dd', { text: value }));
    }
    const actions = element('div', { className: 'kl-cm-about-actions' });
    if (this.#directoryEnabled) {
      const report = this.#button('report-community', 'Report community', () => this.#reportCommunity(c));
      report.prepend(kikiIcon('flag'));
      if (this.#loading) report.setAttribute('aria-disabled', 'true');
      actions.append(report);
    }
    if (c.membership === 'active' && c.role !== 'owner') {
      const source = this.#managementSources.get(c);
      const authorized = () => {
        const latest = this.#community;
        return this.#valid(this.#token) && this.client.connected && this.#selected === c.id && !!source?.current() &&
          latest?.id === c.id && latest.membership === 'active' && latest.role === c.role && latest.access === c.access &&
          latest.archived === c.archived && latest.restricted === c.restricted && (this.#tab === 'about' || latest.archived);
      };
      const leave = this.#button('leave', 'Leave community', () => {
        if (!this.#loading && authorized() && this.#community?.revision === c.revision)
          this.#membership(c, 'leave', 'Leave community', 'Leave this community? Access to its channels will end.', { authorized, returnAction: 'leave' });
      });
      if (this.#loading) leave.setAttribute('aria-disabled', 'true');
      actions.append(leave);
    }
    root.append(element('div', { className: 'kl-cm-about-grid' },
      element('section', { className: 'kl-cm-panel' }, element('h2', { text: `About ${c.name}` }), element('p', { text: c.description })),
      element('section', { className: 'kl-cm-panel' }, element('h2', { text: 'Community rules' }),
        c.rules.length ? element('ol', {}, ...c.rules.map(rule => element('li', { text: rule }))) : element('p', { className: 'kl-cm-meta', text: 'No additional rules.' })),
      element('section', { className: 'kl-cm-panel' }, element('h2', { text: 'The details' }), facts, communityTags(c.tags)),
      actions.childElementCount ? actions : null));
    if(c.restricted)root.append(element('p',{className:'kl-cm-status',text:'This community is restricted by platform moderators.'}));
  }
  #showGuestSections(c: Community): boolean {
    return c.membership !== 'active' && c.access !== 'public' && !c.archived && !c.restricted;
  }
  #communityTabs(): string[] {
    return ['overview', 'channels', ...(this.#eventsEnabled ? ['events'] : []), 'active', 'about'];
  }
  #openSection(tab: string, trigger: HTMLButtonElement): void {
    const community = this.#community;
    if (!community || community.id !== this.#selected || !this.#channelIdentity() || !this.client.connected) return;
    trigger.focus({ preventScroll: true });
    const navigation = { trigger };
    if (this.#showGuestSections(community)) {
      this.#tab = tab;
      this.#render(navigation);
    } else if (community.membership === 'active') this.#switchTab(tab, navigation);
  }
  #communitySections(c: Community): HTMLElement {
    const tabs = element('nav', { className: 'kl-cm-tabs kl-cm-sections', ariaLabel: 'Community sections' });
    const buttons: HTMLButtonElement[] = [];
    for (const tab of this.#communityTabs()) {
      const button = this.#button(`tab-${tab}`, labels[tab] ?? tab, () => this.#openSection(tab, button));
      button.setAttribute('aria-pressed', String(this.#tab === tab));
      if (tab === 'events' && c.membership === 'active' && c.upcomingEvents) {
        const count = element('span', { className: 'kl-cm-tab-count', text: String(c.upcomingEvents) });
        count.setAttribute('aria-hidden', 'true');
        button.append(count);
      }
      buttons.push(button);
      tabs.append(button);
    }
    tabs.addEventListener('keydown', event => {
      if (!(event.target instanceof HTMLButtonElement) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = buttons.indexOf(event.target);
      if (index < 0) return;
      let next: number;
      switch (event.key) {
        case 'Home': next = 0; break;
        case 'End': next = buttons.length - 1; break;
        case 'ArrowLeft': next = (index + buttons.length - 1) % buttons.length; break;
        case 'ArrowRight': next = (index + 1) % buttons.length; break;
        default: return;
      }
      event.preventDefault();
      buttons[next]?.click();
    });
    return tabs;
  }
  #renderCommunity(root: HTMLElement, c: Community): void {
    const role = c.role ? element('span', { className: `kl-cm-role${c.role === 'owner' || c.role === 'admin' ? ' kl-cm-role--gold' : ''}` }, kikiIcon(c.role === 'member' ? 'check' : 'shield'), roles[c.role]) : null;
    const hero = element('section', { className: 'kl-cm-hero' },
      element('div', { className: 'kl-cm-identity' }, communityIcon(c),
        element('div', {},
          element('div', { className: 'kl-cm-identity-title' }, element('h1', { text: c.name, title: c.name }), role),
          element('div', { className: 'kl-cm-card-facts' }, this.#visibility(c), this.#memberCount(c), this.#presence(c)))),
      element('p', { text: c.description }));
    root.append(hero);
    const actions=element('div',{className:'kl-cm-actions'});hero.append(actions);
    const context = this.#channelIcon('detail-context', 'Community information', 'info', () => this.#openCommunityContext(c));
    context.setAttribute('aria-haspopup', 'dialog');
    context.disabled ||= this.#loading;
    if (c.membership !== 'active') {
      if (c.membership === 'requested' && !c.archived && !c.restricted) actions.append(this.#membershipMenu(c, 'detail'));
      else actions.append(...this.#entryActions(c));
      if (this.#directoryEnabled) actions.append(this.#communityOptions(c, false));
      actions.append(context);
      const guestSections = this.#showGuestSections(c);
      if (guestSections) root.append(this.#communitySections(c));
      if (!guestSections || this.#tab === 'about') this.#renderAbout(root, c);
      else root.append(element('section', { className: 'kl-cm-access-state' },
        element('h2', { text: 'Membership required' }),
        element('p', { text: 'This community’s conversations, members, and plans are shared with its members.' })));
      return;
    }
    actions.append(c.archived || c.restricted ? element('span', { className: 'kl-cm-joined' }, kikiIcon('check'), 'Joined') : this.#membershipMenu(c, 'detail'));
    if (this.#notificationDefaults && this.#notificationDialog && !c.archived && !c.restricted) {
      const notifications = this.#button('notifications', 'Notifications', () => void this.#notificationDialog!.open(c.id));
      notifications.prepend(kikiIcon('notifications')); actions.append(notifications);
    }
    if (!c.restricted&&(c.canReview || c.canInvite || this.#customizationEnabled&&this.#canOwnCommunity(c))) {
      const modal=this.#customizationEnabled&&this.#canOpenManager(c);
      const manage = this.#button('manage', 'Manage', () => {
        if(modal)this.#editCommunity(c);
        else { this.#management = !this.#management; this.#render(); }
      });
      manage.prepend(kikiIcon('settings'));
      if(modal)manage.setAttribute('aria-haspopup','dialog');
      else manage.setAttribute('aria-expanded',String(this.#management));
      actions.append(manage);
    }
    if (this.#directoryEnabled) actions.append(this.#communityOptions(c, false));
    if (this.#tab !== 'channels') actions.append(context);
    const management=element('section',{className:'kl-cm-management',ariaLabel:'Community management'});management.hidden=!this.#management;management.append(element('h2',{className:'kl-cm-management-heading',text:'Community management'}),element('p',{className:'kl-mod-note',text:'Review requests, reports and community settings within your current role.'}));
    const controls=element('div',{className:'kl-cm-actions'});management.append(controls);
    if(c.canInvite)controls.append(this.#button('invite','Invite member',()=>this.#membership(c,'invite','Invite member','Invite a member to this community?')));
    if(c.canManage&&!c.archived)controls.append(this.#button('settings','Settings',()=>this.#editCommunity(c)));
    if(c.role==='owner'&&!c.restricted)controls.append(this.#button('archive',c.archived?'Restore community':'Archive community',()=>this.#archiveCommunity(c)));
    if(c.canReview&&!c.archived){const team=this.#button('tab-team','Team',()=>this.#switchTab('active'));team.setAttribute('aria-pressed',String(this.#tab==='active'));controls.append(team);}
    if(!c.archived)for(const tab of [...(c.canReview?['requested','audit',...(this.#moderationEnabled?['reports']:[])]:[]),...(c.canManage?['invited','banned',...(this.#moderationEnabled?['archives']:[])]:[])]){const b=this.#button(`tab-${tab}`,labels[tab]??tab,()=>this.#switchTab(tab));b.setAttribute('aria-pressed',String(this.#tab===tab));controls.append(b);}
    if(c.canReview||c.canInvite)root.append(management);
    if(c.archived){this.#renderAbout(root,c);return;}
    root.append(this.#communitySections(c));
    if(this.#tab==='overview')this.#renderOverview(root,c);
    else if(this.#tab==='about')this.#renderAbout(root,c);
    else if(this.#tab==='events')this.#previewEvents(root,c);
    else     if (this.#tab === 'channels') this.#renderChannels(root, c);
    else if (this.#tab === 'reports') root.append(this.#moderation.element);
    else if (this.#tab === 'archives') {
      const rows = element('div', { className: 'kl-cm-rows' }); root.append(rows);
      for (const ch of this.#archives) rows.append(element('article', {}, element('div', {}, element('strong', { text: `#${ch.name}` }), element('p', { text: ch.topic })), this.#button(`restore-${ch.id}`, 'Restore channel', () => this.#channelArchive(ch, false))));
      if (!this.#archives.length && !this.#loading) rows.append(element('p', { className: 'kl-cm-empty', text: 'No archived channels.' }));
    } else if (this.#tab === 'audit') {
      root.append(element('div', { className: 'kl-cm-rows' }, ...this.#audit.map(e => element('article', {}, element('strong', { text: `${this.#name(e.actor)} · ${e.action.replaceAll('_', ' ')}` }), element('small', { text: new Date(e.createdAt).toLocaleString() })))));
      if (this.#cursor !== null) root.append(this.#button('more-audit', 'Older activity', () => void this.refresh(true)));
    } else {
      if(this.#directoryEnabled){
        const role=element('select',{ariaLabel:'Filter member roles'});role.dataset.communityField='member-role';for(const[value,text]of [['','All roles'],...Object.entries(roles)]){const o=element('option',{text:text!});o.value=value!;role.append(o);}role.value=this.#memberRole;role.addEventListener('change',()=>{this.#memberRole=role.value;this.#cursor=null;void this.refresh();});
        const online=this.#button('members-online','Online now',()=>{this.#memberOnline=this.#memberOnline==='1'?'0':'1';this.#cursor=null;void this.refresh();});online.setAttribute('aria-pressed',String(this.#memberOnline==='1'));this.#memberSearch.disabled=this.#busy;role.disabled=this.#busy;
        root.append(element('div',{className:'kl-cm-member-search'},this.#memberSearchBox,role,...(this.#tab==='active'?[online]:[])));
      }
      if(this.#management&&c.canReview)root.append(element('h2',{className:'kl-cm-management-heading',text:this.#tab==='requested'?'Pending join requests':this.#tab==='active'?'Community team and members':labels[this.#tab]??'Members'}));
      const directoryMembers = this.#directoryEnabled && this.#tab === 'active' && !this.#management;
      if (directoryMembers && !this.#loading && !this.#error) {
        const summary = element('p', { className: 'kl-cm-member-summary', text: `${this.#members.length} shown · ${c.memberCount} in the community` });
        summary.setAttribute('role', 'status');
        root.append(summary);
      }
      const rows = element('div', { className: directoryMembers ? 'kl-cm-rows kl-cm-members kl-cm-members--directory' : 'kl-cm-rows kl-cm-members' }); root.append(rows);
      for (const m of this.#members) {
        const profileVisible = directoryMembers ? this.#memberProfileVisible(m) : m.profileVisible;
        const displayName = !directoryMembers || profileVisible ? m.displayName : null;
        const name=this.#directoryEnabled?`${displayName??'Member'} · #${m.memberNumber}`:this.#name(m.memberNumber);
        const profileAvailable = directoryMembers ? this.#memberProfileAvailable(m) : m.profileVisible && this.options.openProfile;
        const identity=element('div',{className:'kl-cm-member-identity'}),text=element('div',{},profileAvailable?this.#button(`profile-${m.memberNumber}`,name,()=>{
          const current = directoryMembers ? this.#currentDirectoryMember(c.id, m.memberNumber)?.member : undefined;
          if (!directoryMembers || current && this.#memberProfileAvailable(current)) this.options.openProfile?.(m.memberNumber);
        }):element('strong',{text:name}));
        if (this.#directoryEnabled) {
          const avatar = element('span', { className: 'kl-cm-member-avatar', text: (displayName ?? 'M').trim().split(/\s+/u).slice(0, 2)
            .map(word => [...word][0] ?? '').join('').toUpperCase() });
          const showProfileFields = !directoryMembers || profileVisible;
          if (showProfileFields && m.avatarId) {
            const photo = this.options.avatar?.(m.avatarId, m.memberNumber === this.client.memberNumber);
            if (photo) avatar.append(photo);
          }
          const status = (showProfileFields ? m.status : undefined) ?? 'unavailable';
          avatar.append(element('span', { className: `kl-cm-presence kl-cm-presence--${status}`, ariaLabel: status === 'unavailable' ? 'Presence not shared' : status }));
          identity.append(avatar);
          text.append(element('small', { text: [showProfileFields && m.username ? `@${m.username}` : '',
            status === 'online' ? 'Online' : status === 'idle' ? 'Away' : status === 'dnd' ? 'Do not disturb' : 'Presence not shared'].filter(Boolean).join(' · ') }));
        }
        text.firstElementChild?.classList.add('kl-cm-member-name');identity.append(text);
        const roleBadge = element('span', { className: m.role === 'owner' || m.role === 'admin' ? 'kl-cm-role kl-cm-role--gold' : 'kl-cm-role', text: roles[m.role] });
        const row = element('article', {}, identity, roleBadge); rows.append(row);
        if (directoryMembers) row.append(this.#memberOptions(c, m));
        else {
          const controls = element('div', { className: 'kl-cm-actions' });
          this.#appendMemberActions(controls,c,m,this.#tab,()=>c,true);
          if (this.#directoryEnabled && controls.childElementCount)
            row.append(element('details', { className: 'kl-cm-member-menu' }, element('summary', { ariaLabel: `Actions for ${name}`, title: `Actions for ${name}` }, kikiIcon('more')), controls));
          else if (!this.#directoryEnabled) row.append(controls);
        }
        if(this.#management&&c.canReview&&(m.memberNumber===this.client.memberNumber||m.role==='owner'))row.append(element('small',{className:'kl-mod-note',text:'Protected role'}));
      }
      if(this.#management&&this.#tab==='active'&&c.canReview){
        const guide=element('section',{className:'kl-cm-role-guide'},element('h2',{className:'kl-cm-management-heading',text:'Who can do what?'}));
        const table=element('table',{},element('thead',{},element('tr',{},element('th',{text:'Role'}),element('th',{text:'Community permissions'}))));
        const body=element('tbody');for(const[role,description]of [['Moderator','Review channel reports and join requests.'],['Administrator','Also manage member and moderator roles.'],['Owner','Also appoint administrators and transfer ownership.']])body.append(element('tr',{},element('th',{text:role!}),element('td',{text:description!})));table.append(body);guide.append(table,element('p',{className:'kl-mod-note',text:'Your own role and the owner are protected here. Every change is checked against your current server permissions.'}));root.append(guide);
      }
      if (!this.#members.length && !this.#loading && !this.#error) {
        if (directoryMembers) {
          const filtered = this.#memberSearch.value.trim() || this.#memberRole || this.#memberOnline === '1';
          rows.append(element('div', { className: 'kl-cm-member-empty' },
            element('h3', { text: filtered ? 'No matching members' : 'No members in this view' }),
            element('p', { text: filtered ? this.#memberOnline === '1' ? 'Try another name or role, or clear the online filter.' : 'Try another name or role.' : 'Members will appear here when available.' })));
        } else rows.append(element('p', { text: 'No members in this view.' }));
      }
      if (this.#cursor !== null) root.append(this.#button('more-members', 'Next members', () => void this.refresh(true)));
    }
  }
  #currentDirectoryMember(communityId: string, memberNumber: number): { community: Community; member: Member } | undefined {
    const community = this.#community;
    if (!this.#valid(this.#token) || !this.#directoryEnabled || this.#tab !== 'active' || this.#management ||
      this.#loading || this.#busy || this.#error || this.#selected !== communityId || community?.id !== communityId ||
      community.membership !== 'active' || community.archived || !this.#managementSources.get(community)?.current()) return;
    const member = this.#members.find(row => row.memberNumber === memberNumber);
    if (member?.state === 'active') return { community, member };
  }
  #memberProfileVisible(member: Member): boolean {
    return member.profileVisible === true &&
      !this.options.blocked?.(member.memberNumber) && !this.client.isProfileBlocked?.(member.memberNumber);
  }
  #memberProfileAvailable(member: Member): boolean {
    return !!this.options.openProfile && this.#memberProfileVisible(member);
  }
  #memberLabel(member: Member): string {
    return (this.#memberProfileVisible(member) ? member.displayName : null) || `Member #${member.memberNumber}`;
  }
  #memberOptions(community: Community, member: Member): HTMLButtonElement {
    const action = `member-options-${member.memberNumber}`;
    const canMessage = (target: Member) => this.#memberProfileVisible(target) && target.memberNumber !== this.client.memberNumber &&
      !!this.options.openMemberChat && this.options.canMessageMember?.(target.memberNumber) === true;
    const trigger = this.#channelIcon(action, `Options for ${this.#memberLabel(member)}`, 'more', () => {
      const current = () => trigger.isConnected ? this.#currentDirectoryMember(community.id, member.memberNumber) : undefined;
      const state = current();
      if (!state) return;
      const actions: ShellAction[] = [this.#memberProfileAvailable(state.member)
        ? { label: 'View profile', icon: 'profile', run: () => {
          const target = current()?.member;
          if (target && this.#memberProfileAvailable(target)) this.options.openProfile?.(target.memberNumber);
        } }
        : { label: 'Member details', icon: 'profile', run: () => {
          const target = current()?.member;
          if (target && !this.#memberProfileAvailable(target)) this.#openMemberDetails(target, this.#memberLabel(target), trigger);
        } }];
      if (canMessage(state.member)) actions.push({ label: 'Send message', icon: 'chat', run: () => {
        const target = current()?.member;
        if (target && canMessage(target)) this.options.openMemberChat?.(target.memberNumber, target.displayName ?? undefined);
      } });
      if (this.#canEditSettings(state.community)) actions.push({ label: 'Manage community team', icon: 'shield', run: () => {
        const currentCommunity = current()?.community;
        if (!currentCommunity || !this.#canEditSettings(currentCommunity)) return;
        if (this.#customizationEnabled) this.#editCommunity(currentCommunity, undefined, 'name', action, 'members');
        else {
          this.#management = true;
          this.#render();
          this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-team"]')?.focus({ preventScroll: true });
        }
      } });
      this.#overlays.append(this.#memberMenu.element);
      this.#memberMenu.open(trigger, this.#memberLabel(state.member), actions);
      this.#memberMenu.element.setAttribute('aria-label', 'Member options');
    });
    trigger.classList.add('kl-cm-member-options-trigger');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.disabled ||= this.#loading || !!this.#error;
    return trigger;
  }
  #openMemberDetails(member: Member, name: string, opener: HTMLButtonElement): void {
    const { dialog, close } = this.#dialog(name);
    this.#memberDetails = dialog;
    dialog.classList.remove('kl-cm-dialog');
    dialog.classList.add('kl-cm-member-details-dialog', 'kl-explore-share-dialog');
    const dismiss = this.#button('close-member-details', 'Close', close);
    dialog.replaceChildren(
      element('header', { className: 'kl-explore-share-heading' },
        element('div', {}, element('span', { className: 'kl-explore-share-eyebrow', text: 'KIKILINK' }), element('h2', { text: name })),
        iconButton('Close dialog', 'close', close)),
      element('div', { className: 'kl-explore-share-body' },
        element('p', {}, element('span', { className: 'kl-cm-role', text: roles[member.role] })),
        element('p', { text: 'A full profile is unavailable for this community member.' })),
      element('footer', { className: 'kl-explore-share-footer' }, dismiss),
    );
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('close', () => {
      if (this.#memberDetails !== dialog) return;
      this.#memberDetails = undefined;
      if (!this.#closeDialog && opener.isConnected && this.#valid(this.#token)) opener.focus({ preventScroll: true });
    }, { once: true });
    dialog.showModal();
    fitPanelDialog(dialog);
    dismiss.focus({ preventScroll: true });
  }
  #appendMemberActions(controls:HTMLElement,c:Community,m:Member,state:string,current:()=>Community|undefined,includeOwnership:boolean):void {
    if(m.memberNumber===this.client.memberNumber||m.role==='owner')return;
    const path=`/v1/communities/${c.id}/members/${m.memberNumber}`;
    const action=(name:string,label:string)=>controls.append(this.#button(`${name}-${m.memberNumber}`,label,()=>{
      const source=current();
      if(source)this.#manage(source,label,`${label}: ${this.#name(m.memberNumber)}?`,path,{action:name},source.revision);
    }));
    if(state==='requested'&&c.canReview){action('approve','Approve');action('decline','Decline');}
    else if(c.canManage&&c.role&&level[c.role]>level[m.role]){
      if(state==='invited')action('revoke','Revoke invitation');
      else if(state==='banned')action('unban','Lift ban');
      else {
        const select=element('select',{ariaLabel:`Role for #${m.memberNumber}`});select.dataset.communityField=`role-${m.memberNumber}`;
        const allowed:Role[]=c.role==='owner'?['member','moderator','admin']:['member','moderator'];
        for(const role of allowed){const option=element('option',{text:roles[role]});option.value=role;select.append(option);}
        select.value=m.role;
        controls.append(select,this.#button(`role-${m.memberNumber}`,'Change role',()=>{
          const source=current(),role=select.value as Role;
          if(!source||!allowed.includes(role))return;
          this.#managementAction.open({title:'Change community role',description:element('p',{},'Update ',element('strong',{text:this.#managerMemberName(m)}),`’s role in ${source.name}.`),
            communityId:source.id,path,revision:source.revision,data:{action:'role',role},generation:this.#managementSources.get(source)?.generation,
            presentation:'manager-review',roles:[...allowed].reverse().map(value=>({value,label:roles[value]})),submitLabel:'Save role',backLabel:'Back to members'});
        }));
        action('remove','Remove');action('ban','Ban');
      }
    }
    if(includeOwnership&&c.role==='owner'&&m.state==='active')controls.append(this.#button(`ownership-${m.memberNumber}`,'Transfer ownership',()=>this.#manage(c,'Transfer ownership',`Make ${this.#name(m.memberNumber)} the owner? You will become an administrator.`,`/v1/communities/${c.id}/ownership`,{memberNumber:m.memberNumber},c.revision)));
  }
  #selectChannel(channelId?: string, navigation?: SectionNavigation): void {
    this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.();
    this.#audio.pause(); this.#upload?.controller?.abort(); this.#upload = undefined;
    this.#channelId = channelId; this.#channelReopen = !!channelId; this.#channelHold = false;
    this.#target = undefined; this.#historyBefore = 0; this.#channelScroll = undefined; this.#scrollToChannel = !!channelId;
    this.#editorVisible = false; ++this.#editEpoch; void this.refresh(false, false, navigation);
  }
  #muteScope(ch: Channel): ChannelMuteScope {
    return {communityId: this.#selected!, channelId: ch.id, ...(ch.recoveryGeneration ? { recoveryGeneration: ch.recoveryGeneration } : {})};
  }
  #muteLabel(until: number): HTMLElement {
    return until === -1 ? element('span', {text: 'Muted until you turn it back on'}) :
      bindClockText(element('span'), until, 'muted-date-time');
  }
  #syncChannelTopic(topic: HTMLElement, ch: Channel): void {
    const until = this.options.channelMuteUntil?.(this.#muteScope(ch)) ?? 0;
    if (topic.dataset.muteUntil === String(until)) return;
    topic.dataset.muteUntil = String(until);
    topic.replaceChildren(ch.topic);
    if (until) topic.append(ch.topic ? ' · ' : '', this.#muteLabel(until));
    topic.title = topic.textContent ?? ch.topic;
  }
  syncChannelMutes(): void {
    if (!this.#visible || this.#destroyed || this.#tab !== 'channels' || !this.#selected || !this.options.channelMuteUntil) return;
    const rows = new Map(this.#channels.map(ch => [ch.id, ch]));
    for (const badge of this.#content.querySelectorAll<HTMLElement>('.kl-cm-channel-badges')) {
      const channel = rows.get(badge.dataset.channelId ?? '');
      if (channel && badge.dataset.muteUntil !== String(this.options.channelMuteUntil(this.#muteScope(channel)))) this.#renderChannelBadges(badge, channel);
    }
    const button = this.#channelOptions?.querySelector<HTMLButtonElement>('[data-community-action="channel-timed-mute"]');
    const channel = this.#channelId && rows.get(this.#channelId);
    if (channel) {
      const topic = this.#content.querySelector<HTMLElement>('.kl-cm-channel-title p');
      if (topic) this.#syncChannelTopic(topic, channel);
      if (button) this.#updateChannelMuteButton(button, this.#muteScope(channel));
    }
  }
  #updateChannelMuteButton(button: HTMLButtonElement, scope: ChannelMuteScope): void {
    const label = this.options.channelMuteUntil?.(scope) ? 'Manage channel mute…' : 'Mute channel…';
    if (button.textContent !== label) button.textContent = label;
    button.disabled = this.#busy || !this.options.canSetChannelMute?.(scope);
  }
  #renderChannelBadges(badges: HTMLElement, ch: Channel): void {
    const until = this.options.channelMuteUntil?.(this.#muteScope(ch)) ?? 0;
    badges.dataset.channelId = ch.id;
    badges.dataset.muteUntil = String(until);
    badges.replaceChildren(
      ...(ch.unread ? [element('span', { className: 'kl-cm-channel-unread', text: String(ch.unread), ariaLabel: `${ch.unread} unread` })] : []),
      ...(ch.mentions ? [element('span', { text: '@', ariaLabel: `${ch.mentions} mentions` })] : []),
      ...(until ? [element('span', {}, kikiIcon('muted'), this.#muteLabel(until))]
        : ch.mode === 'off' ? [element('span', { ariaLabel: 'Muted', title: 'Muted' }, kikiIcon('muted'))] : []),
    );
  }
  #renderChannelRows(list: HTMLElement): void {
    const query = this.#channelSearch.value.trim().toLocaleLowerCase();
    const rows = this.#channels.filter(ch => `${ch.name} ${ch.topic}`.toLocaleLowerCase().includes(query)).map(ch => {
      const row = this.#button(`channel-${ch.id}`, '', () => this.#selectChannel(ch.id));
      row.classList.add('kl-cm-channel-row');
      if (ch.id === this.#channelId) row.setAttribute('aria-current', 'page');
      const badges = element('span', { className: 'kl-cm-channel-badges' });
      this.#renderChannelBadges(badges, ch);
      row.append(kikiIcon(ch.visibility === 'members' ? 'chat' : 'lock'),
        element('span', { className: 'kl-cm-channel-copy' }, element('strong', { text: `# ${ch.name}`, title: ch.name }),
          element('small', { text: ch.topic || (ch.canPost ? 'Channel conversation' : 'Read only') }), badges));
      return row;
    });
    if (rows.length) { list.replaceChildren(...rows); return; }
    const empty = element('div', { className: 'kl-cm-channel-filter-empty' },
      element('h3', { text: 'No matching channels' }), element('p', { text: 'Try another channel name.' }),
      this.#button('reset-channel-search', 'Reset search', () => {
        this.#channelSearch.value = '';
        this.#channelSearch.dispatchEvent(new Event('input'));
        this.#channelSearch.focus({ preventScroll: true });
      }));
    list.replaceChildren(empty);
  }
  #channelDirectoryState(): 'loading' | 'error' | 'empty' | undefined {
    if (this.#tab !== 'channels' || this.#community?.membership !== 'active' || this.#community.archived) return;
    if (this.#loading) return !this.#channelId || !this.#channels.length ? 'loading' : undefined;
    if (this.#channelDirectoryFailed && this.#error) return 'error';
    if (!this.#channelId && !this.#channels.length) return 'empty';
  }
  #renderChannelDirectoryState(layout: HTMLElement, c: Community, state: 'loading' | 'error' | 'empty'): void {
    layout.dataset.channelDirectoryState = state;
    if (state === 'loading') {
      const loading = element('div', { className: 'kl-cm-channel-directory-loading', ariaLabel: 'Loading community channels' });
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-busy', 'true');
      for (let index = 0; index < 3; index++) {
        const card = element('div', { className: 'kl-cm-skeleton-card' },
          element('div', { className: 'kl-cm-skeleton' }),
          element('div', { className: 'kl-cm-skeleton kl-cm-skeleton--short' }));
        card.setAttribute('aria-hidden', 'true');
        loading.append(card);
      }
      layout.append(loading);
      return;
    }
    const failed = state === 'error';
    const card = element('div', { className: 'kl-cm-empty kl-cm-channel-directory-empty' }, kikiIcon('chat'),
      element('h3', { text: failed ? 'Channels couldn’t load' : 'A little room for conversation' }),
      element('p', { text: failed ? this.#error : 'Your community’s channels will appear here.' }));
    if (failed) {
      card.setAttribute('role', 'alert');
      const retry = this.#button('retry-channels', 'Retry', () => {
        if (this.#loading) return;
        if (focusedElement(this.element) === retry) this.#content.querySelector<HTMLButtonElement>('[data-community-action="tab-channels"]')?.focus({ preventScroll: true });
        void this.refresh();
      }, true);
      card.append(retry);
    } else if (c.canManage) {
      const create = this.#button('new-channel', 'Create channel', () => this.#editChannel(c), true);
      create.prepend(kikiIcon('plus'));
      card.append(create);
    }
    layout.append(card);
  }
  #renderChannels(root: HTMLElement, c: Community): void {
    const layout = element('div', { className: 'kl-cm-channel-layout' });
    const directoryState = this.#channelDirectoryState();
    if (directoryState) {
      this.#renderChannelDirectoryState(layout, c, directoryState);
      root.append(layout);
      return;
    }
    const list = element('nav', { className: 'kl-cm-channel-list', ariaLabel: 'Channels' });
    const rows = element('div', { className: 'kl-cm-channel-rows' });
    rows.dataset.communityId = c.id;
    const ch = this.#channels.find(ch => ch.id === this.#channelId);
    const thread = element('section', { className: 'kl-cm-thread', ariaLabel: ch ? `${ch.name} channel` : 'Channel messages' });
    layout.dataset.channelOpen = String(!!ch);
    this.#channelSearch.disabled = this.#busy;
    list.append(element('div', { className: 'kl-cm-channel-search' }, this.#channelSearchBox), rows);
    if (c.canManage) {
      const create = this.#button('new-channel', 'Create channel', () => this.#editChannel(c));
      create.prepend(kikiIcon('plus')); list.append(create);
    }
    this.#renderChannelRows(rows); layout.append(list, thread); root.append(layout);
    if (!ch) { thread.append(this.#emptyState('chat', 'Choose a channel', 'Only channels you can access are shown.')); return; }
    const back = this.#channelIcon('back-to-channels', 'Back to channels', 'back', () => { this.#selectChannel(); this.#channelSearch.focus({ preventScroll: true }); });
    back.classList.add('kl-cm-channel-back');
    const members = this.#channelIcon('channel-members', 'Community members', 'users', () => this.#switchTab('active'));
    members.classList.add('kl-cm-channel-members');
    const topic = element('p');
    this.#syncChannelTopic(topic, ch);
    const header = element('header', { className: 'kl-cm-channel-header' }, back, kikiIcon(ch.visibility === 'members' ? 'chat' : 'lock'),
      element('div', { className: 'kl-cm-channel-title' }, element('h2', { text: `# ${ch.name}` }), topic), members);
    thread.append(header);
    if (this.#channelHold) {
      thread.append(element('p', { text: 'Channel history changed. Your draft is kept. Open the current channel before marking messages read.' }),
        this.#button('current-channel', 'Read current channel', () => { this.#channelReopen = true; this.#channelHold = false; this.#target = undefined; this.#historyBefore = 0; void this.refresh(); }));
      return;
    }
    const controls = element('div', { className: 'kl-cm-actions' });
    const dialog = element('dialog', { className: 'kl-dialog kl-cm-channel-options-dialog', ariaLabel: 'Channel options' });
    dialog.addEventListener('keydown', event => event.stopPropagation());
    dialog.addEventListener('close', this.#scheduleRead);
    const options = this.#channelIcon('channel-options', 'Channel options', 'more', () => {
      this.#channelMenu.close(false); this.#closeDialog?.(); this.#mentions.close(); dialog.showModal();
    });
    options.setAttribute('aria-haspopup', 'dialog'); options.classList.add('kl-cm-channel-options');
    controls.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('button')) dialog.close();
    }, true);
    dialog.append(element('h2', { text: `# ${ch.name}` }), controls,
      this.#button('close-channel-options', 'Close', () => dialog.close()));
    if (this.#rich && this.options.openChannelMute) {
      const scope = this.#muteScope(ch);
      const current = () => !this.#destroyed && this.#visible && this.options.current() &&
        this.#tab === 'channels' && this.#selected === c.id && this.#channelId === ch.id;
      const mute = this.#button('channel-timed-mute', '', () => {
        if (!current() || !this.options.canSetChannelMute?.(scope)) return;
        options.focus({preventScroll: true});
        this.options.openChannelMute?.(scope, current, () => {
          if (current()) {
            this.#content.querySelector<HTMLButtonElement>('[data-community-action="channel-options"]')?.focus({preventScroll:true});
            this.#scheduleRead();
          }
        });
      });
      this.#updateChannelMuteButton(mute, scope);
      controls.append(mute);
    }
    if (c.canManage) controls.append(this.#button('channel-settings', 'Channel settings', () => this.#editChannel(c,ch)));
    if (c.canManage && this.#moderationEnabled) controls.append(this.#button('archive-channel', 'Archive channel', () => this.#channelArchive(ch, true)));
    if (this.#rich && !this.#loading) {
      const saveHistory=this.#button('save-channel-history','Save history ZIP',()=>{
        this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.(); this.#audio.pause(); this.#mentions.close();
        this.#historyArchive.open(this.client,{kind:'channel',containerId:c.id,id:ch.id,label:`${c.name} / #${ch.name}`},()=>!this.#destroyed&&this.#visible&&this.#tab==='channels'&&this.options.current()&&this.#selected===c.id&&this.#channelId===ch.id&&this.#community?.membership==='active'&&!this.#community?.archived,options);
      });
      const restoredHistory=this.#button('restore-channel-history','Restore history ZIP',()=>{
        this.#historyTimeline.close();this.#historyArchive.close();this.#closeDialog?.();this.#audio.pause();this.#mentions.close();
        this.#historyCopies.open(this.client,{kind:'channel',containerId:c.id,id:ch.id,label:`${c.name} / #${ch.name}`},()=>!this.#destroyed&&this.#visible&&this.#tab==='channels'&&this.options.current()&&this.#selected===c.id&&this.#channelId===ch.id&&this.#community?.membership==='active'&&!this.#community?.archived,options,n=>this.options.blocked?.(n)??false);
      });
      const combinedHistory=this.#button('combined-channel-history','Show combined history',()=>{this.#historyArchive.close();this.#historyCopies.close();this.#closeDialog?.();this.#audio.pause();this.#mentions.close();this.#historyTimeline.open(thread,{client:this.client,scope:{kind:'channel',containerId:c.id,id:ch.id,label:`${c.name} / #${ch.name}`},current:()=>!this.#destroyed&&this.#visible&&this.#tab==='channels'&&this.options.current()&&this.#selected===c.id&&this.#channelId===ch.id&&this.#community?.membership==='active'&&!this.#community?.archived,live:()=>this.#messages,blocked:n=>this.options.blocked?.(n)??false,focus:options,returned:()=>this.#render()});});
      controls.append(saveHistory,restoredHistory,combinedHistory);
      const preference = element('select', { ariaLabel: 'Channel notifications' }); preference.dataset.communityField = 'notifications';
      for (const [value,label] of [['mentions','Mentions only'],['all','All messages'],['off','Muted']]) { const o=element('option',{text:label!}); o.value=value!; preference.append(o); }
      const preferencePath=`/v1/communities/${c.id}/channels/${ch.id}/preferences`,preferenceAttempt=this.#channelActions.get(preferencePath);
      preference.value = String(preferenceAttempt?.pending?.mode??ch.mode??'mentions'); preference.disabled = this.#busy||!!preferenceAttempt;
      preference.addEventListener('change', () => { if(preference.isConnected&&!preference.disabled)void this.#channelPreference(c,ch,preference.value); });
      controls.append(preference, this.#button('read-channel', 'Mark read', () => { void this.#markRead(ch, ch.latest ?? 0); }));
    }
    controls.append(this.#button('refresh-channel', 'Refresh channel', () => void this.refresh()));
    this.#channelOptions = dialog; header.append(options); thread.append(dialog);
    if(this.#historyTimeline.active){this.#historyTimeline.mount(thread);if(this.#historyTimeline.active){this.#historyTimeline.sync();return;}}
    if (this.#historyBefore || this.#target) thread.append(this.#button('latest-messages', 'Back to latest', () => { this.#target = undefined; this.#historyBefore = 0; this.#channelScroll = undefined; this.#scrollToChannel = true; void this.refresh(); }));
    if (!this.#loading && this.#messageCursor !== null) thread.append(this.#button('older-messages', 'Older messages', () => void this.#older()));
    const messages = element('div', { className: 'kl-cm-messages', tabIndex: 0, ariaLabel: 'Channel messages' });
    messages.dataset.channelId = ch.id; thread.append(messages);
    if (this.#rich && !this.#loading) this.#reactions = new MessageReactions(this.client, messages, { base: `/v1/communities/${c.id}/channels/${ch.id}`, kind: 'channel', enabled: () => this.#valid(this.#token)&&!this.#channelHold, channel:{communityId:c.id,channelId:ch.id,label:`${c.name} / #${ch.name}`,source:this.#mutationSources.get(ch)!,actions:this.#channelActions,changed:()=>{if(!this.#destroyed)this.#render();}} });
    let previous: Message | undefined;
    for (const m of this.#messages) {
      try { if (this.client.isProfileBlocked?.(m.author) || this.options.blocked?.(m.author)) continue; } catch { continue; }
      const grouped = !!previous && previous.author === m.author && m.createdAt >= previous.createdAt &&
        m.createdAt - previous.createdAt < 300_000 && localDay(previous.createdAt) === localDay(m.createdAt);
      previous = m;
      const name = this.options.name(m.author) || 'Member';
      const text = element('p'); appendMentionText(text,m.text,[],undefined,m.mentions,this.options.openProfile);
      const author = this.options.openProfile
        ? this.#button(`channel-author-${m.id}`, name, () => this.options.openProfile?.(m.author))
        : element('strong', { text: name });
      author.className = 'kl-cm-author'; author.title = this.#name(m.author);
      const meta = element('div', { className: 'kl-cm-message-meta' }, grouped ? null : author,
        bindClockText(element('time'), m.createdAt));
      const bubble = element('div', { className: 'kl-cm-bubble' }, meta, text);
      const row = element('article', { className: `kl-cm-message${m.author===this.client.memberNumber?' kl-cm-message--self':''}` },
        grouped ? null : this.#channelAvatar(m, name), bubble);
      row.dataset.messageId = m.id; row.dataset.highlight = String(m.id === this.#target);
      row.dataset.messageTime = String(m.createdAt); row.dataset.grouped = String(grouped);
      if (grouped) row.setAttribute('aria-label', `Message from ${name}`);
      if(m.mediaIds?.length)bubble.append(element('div',{className:'kl-message-media'},...m.mediaIds.map(id=>this.options.image?.(id)??element('span',{text:'Attached image'}))));
      for(const id of m.audioIds??[])bubble.append(this.#audio.render(id,undefined,undefined,this.#mutationSources.get(m)?.generation));
      this.#reactions?.attach(m.id,bubble);
      const actions = element('div', { className: 'kl-cm-message-actions' });
      if(m.author===this.client.memberNumber||c.canReview)actions.append(this.#button(`delete-${m.id}`,'Delete',()=>{
        const path=`/v1/communities/${c.id}/channels/${ch.id}/messages/${m.id}/delete`,source=this.#mutationSources.get(m);if(!source)return;
        const intent=this.#channelActions.get(path)??new ChannelMutationIntent(this.client,{kind:'delete',path,communityId:c.id,channelId:ch.id,messageId:m.id,revision:ch.revision,label:`${c.name} / #${ch.name}`,preview:m.text},source);
        const run=(data:Record<string,unknown>)=>{this.#channelActions.set(path,intent);void this.#runChannelAction(intent,data);};
        if(this.#moderationEnabled && m.author!==this.client.memberNumber)this.#reasonDialog('Remove message','Remove this message and its attachments for everyone?',reason=>run({reason}));
        else this.#ask('Delete this message?',()=>run({}));
      }));
      if(this.#moderationEnabled && m.author!==this.client.memberNumber) actions.append(this.#button(`report-${m.id}`, 'Report', ()=>this.#report(m)));
      if (actions.childElementCount) {
        const more = element('summary', { className: 'kl-cm-message-options', ariaLabel: 'Message options', title: 'Message options' }, kikiIcon('more'));
        const menu = element('details', { className: 'kl-cm-message-menu' }, more, actions);
        actions.addEventListener('click', () => { menu.open = false; more.focus({ preventScroll: true }); }, true);
        meta.append(menu);
      }
      messages.append(row);
    }
    if (messages.childElementCount) syncDateSeparators(messages, undefined, 'compact');
    else messages.append(element('p', { className: 'kl-cm-empty', text: this.#loading ? 'Loading messages…' : 'No messages yet. Start the conversation.' }));
    if (ch.canPost) {
      const sendPath=`/v1/communities/${c.id}/channels/${ch.id}/messages`;
      const attachments=this.#attachments.get(sendPath)??{mediaIds:[],audioIds:[]};this.#attachments.set(sendPath,attachments);
      const attempt=this.#channelActions.get(sendPath),pending=!!attempt?.pending,held=!!attempt?.held;
      const editable=()=>input.isConnected&&!this.#busy&&!this.#channelHold&&!attempt?.held&&!attempt?.pending&&this.#valid(this.#token)&&this.#selected===c.id&&this.#channelId===ch.id;
      const input = element('textarea', { ariaLabel: 'Message to channel' }); input.maxLength=4000;input.rows=1;input.placeholder=`Message #${ch.name}`;input.value=this.#drafts.get(sendPath)??'';input.dataset.communityField='message';input.readOnly=this.#busy||pending||held;
      if(this.#rich)this.#mentions.bind(input,()=>this.#visible&&this.#channelId===ch.id?{key:`channel:${ch.id}`,channelBase:`${this.#base()}/channels/${ch.id}`,members:[...new Set(this.#messages.map(m=>m.author))]}:undefined);
      const send=()=>{if(!input.isConnected||this.#selected!==c.id||this.#channelId!==ch.id)return;const intent=this.#sendIntent(c,ch);if(intent&&(input.value.trim()||attachments.mediaIds.length||attachments.audioIds.length))void this.#runChannelAction(intent,{text:input.value.trim(),...(this.#rich?attachments:{})});};
      const button = this.#channelIcon('send', pending && !this.#busy ? 'Retry send' : 'Send', 'send', send, true);
      const waitingForChannel = this.#loading;
      const fitInput = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight}px`; };
      const updateSend = () => {
        button.disabled = this.#busy || held || waitingForChannel || (this.#upload?.channel === ch.id && !!this.#upload.files.length) ||
          !(input.value.trim() || attachments.mediaIds.length || attachments.audioIds.length);
      };
      input.addEventListener('input', () => {
        if (editable() && this.#sendIntent(c, ch)) this.#drafts.set(sendPath, input.value);
        fitInput(); updateSend();
      });
      input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&(this.options.enterToSend?.()??true)){event.preventDefault();event.stopPropagation();if(!button.disabled)send();}});
      const emoji = this.#channelIcon('insert-channel-emoji', 'Insert emoji', 'emoji', () => {
        if (!editable()) return;
        const start = input.selectionStart, end = input.selectionEnd;
        const actions: ShellAction[] = ['❤️','👍','😂','✨','🌸','👀','😊','👋','🎉','💜','☕','🎶','🙌','🤍','😌','🔥'].map(label => ({
          label, icon: 'emoji', run: () => {
            if (!editable() || input.value.length - (end - start) + label.length > input.maxLength) return;
            input.setRangeText(label, start, end, 'end'); input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus({ preventScroll: true });
          },
        }));
        this.#mentions.close(); this.#overlays.append(this.#channelMenu.element);
        this.#channelMenu.open(emoji, 'Choose an emoji', actions);
      });
      emoji.disabled = input.readOnly || this.#loading;
      emoji.setAttribute('aria-haspopup', 'menu'); emoji.setAttribute('aria-expanded', 'false');
      const compose=element('div',{className:'kl-cm-compose'}),form=element('form',{className:'kl-cm-composer'},input,emoji,button);form.addEventListener('submit',e=>e.preventDefault());compose.append(form);thread.append(compose);
      updateSend();
      if (input.value.includes('\n')) requestAnimationFrame(() => { if (input.isConnected) fitInput(); });
      if(held)compose.append(element('p',{text:'This draft is held after a channel change. Copy it or review its retained details above.'}));
      if(pending&&!this.#busy)compose.append(element('small',{text:'Sending was not confirmed. Retry send keeps the same message.'}));
      if(this.#rich) {
        const attachmentsBar=element('div',{className:'kl-cm-actions'}),file=element('input',{ariaLabel:'Attach channel images'});file.type='file';file.accept='image/png,image/jpeg,image/webp';file.multiple=true;file.hidden=true;
        file.addEventListener('change',()=>{const files=Array.from(file.files??[]);if(!files.length||!editable()||!this.#sendIntent(c,ch))return;
          if(files.length+attachments.mediaIds.length>4||files.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)||!f.size||f.size>5*1024**2)){this.#error='Choose up to 4 PNG, JPEG or WebP images, up to 5 MiB each.';this.#render();return;}
          this.#upload={channel:ch.id,path:sendPath,files,progress:0,error:''};void this.#uploadImages();
        });
        const image=this.#channelIcon('attach-images','Attach images','image',()=>file.click());image.disabled=this.#busy||this.#loading||pending||held||attachments.mediaIds.length>=4||!!this.#upload?.files.length;
        form.prepend(image, file);
        if(this.#audioEnabled){const audio=this.#channelIcon('attach-audio','Attach MP3','music',()=>{const intent=this.#sendIntent(c,ch);if(!intent)return;this.#audio.open(`#${ch.name}`,id=>{if(!editable()||intent.held||intent.pending||this.#channelActions.get(sendPath)!==intent)return;attachments.audioIds=[id];this.#render();},false,this.#mutationSources.get(ch)?.generation);});audio.disabled=this.#busy||this.#loading||pending||held||!!attachments.audioIds.length;file.after(audio);}
        for(const [kind,ids]of [['mediaIds',attachments.mediaIds],['audioIds',attachments.audioIds]] as const) for(const [index,id]of ids.entries()) {
          const remove=this.#button(`remove-${id}`,`Remove ${kind==='mediaIds'?'image '+(index+1):'MP3'}`,()=>{if(!editable())return;attachments[kind]=attachments[kind].filter(v=>v!==id);this.#render();});remove.disabled=this.#busy||pending||held;attachmentsBar.append(remove);
        }
        const upload=this.#upload;if(upload?.channel===ch.id&&upload.files.length){attachmentsBar.append(element('span',{className:'kl-cm-upload-status',text:upload.controller?`Uploading · ${upload.progress}%`:upload.error}));
          if(!upload.controller)attachmentsBar.append(this.#button('retry-upload','Retry upload',()=>void this.#uploadImages()));
          attachmentsBar.append(this.#button('cancel-upload','Cancel upload',()=>{upload.controller?.abort();this.#upload=undefined;this.#render();}));
        }
        if (attachmentsBar.childElementCount) compose.append(attachmentsBar);
      }
    } else thread.append(element('div', { className: 'kl-cm-compose' },
      element('p', { text: 'Only the community team can post in this channel.' })));
  }
  #channelAvatar(message: Message, name: string): HTMLElement {
    const initials = Array.from(name).slice(0, 2).join('').toUpperCase();
    const profile = this.client.peekProfile?.(message.author);
    const image = profile?.visible && profile.avatarId ? this.options.avatar?.(profile.avatarId, message.author === this.client.memberNumber) : undefined;
    const avatar = element('span', { className: 'kl-cm-avatar' });
    const content = this.options.openProfile
      ? this.#button(`channel-avatar-${message.id}`, '', () => this.options.openProfile?.(message.author))
      : avatar;
    if (content !== avatar) { content.setAttribute('aria-label', `Open ${name}’s profile`); avatar.append(content); }
    content.append(initials);
    if (image) { image.setAttribute('aria-hidden', 'true'); content.append(image); }
    return avatar;
  }
  #dialog(title: string): { dialog: HTMLDialogElement; close: () => void } {
    this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.();
    const dialog = element('dialog', { className: 'kl-dialog kl-cm-dialog', ariaLabel: title });
    dialog.append(element('h2', { text: title }));
    const close = () => { if (dialog.open) dialog.close(); dialog.remove(); if (this.#closeDialog === close) this.#closeDialog = undefined; };
    this.#closeDialog = close; dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
    dialog.addEventListener('close', close); this.#overlays.append(dialog); return { dialog, close };
  }
  #reportCommunity(community: Community): void {
    if (this.#loading || this.#busy || !this.#directoryEnabled) return;
    this.#openReport({ type: 'community', id: community.id, title: 'Report community', label: 'Community', summary: community.name,
      notice: 'Platform moderators will receive your report and the community details visible to you. Private channels and conversations are not included.',
      source: this.#reportSources.get(community) });
  }
  #report(message: Message): void {
    if (this.#loading || this.#busy) return;
    const channel = this.#channels.find(item => item.id === this.#channelId);
    this.#openReport({ type: 'message', id: message.id, title: 'Report message', label: 'ChannelMessage',
      summary: channel ? `Message in #${channel.name}` : 'Channel message', context: this.#community?.name ?? '',
      notice: 'The community team can review this report. You can review it in My reports.',
      source: this.#reportSources.get(message), endpoint: `${this.#messageBase()}/${message.id}/reports` });
  }
  #openReport(options: Pick<Parameters<typeof targetReportDialog>[1], 'type' | 'id' | 'title' | 'label' | 'summary' | 'context' | 'notice' | 'source' | 'endpoint'>): void {
    this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.();
    const opener = focusedElement(this.element);
    const close = () => {
      if (this.#closeDialog !== close) return;
      this.#closeDialog = undefined;
      if (dialog.open) dialog.close();
      dialog.remove();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    const dialog = targetReportDialog(this.client, { ...options, structured: true,
      ...(options.type === 'message' ? {presentation:'channel-message' as const}:{}),
      panel: this.element.closest<HTMLElement>('.kl-panel') ?? undefined,
      current: () => this.#closeDialog === close && this.#visible && this.options.current(), close, submitted: () => {} });
    this.#closeDialog = close;
    dialog.addEventListener('close', close);
    this.#overlays.append(dialog);
    dialog.showModal();
  }
  #reasonDialog(title: string, explanation: string, run: (reason: string) => void): void {
    if (this.#loading || this.#busy) return;
    const { dialog, close } = this.#dialog(title), input = element('textarea', { ariaLabel: 'Reason' }), status = element('p'); status.setAttribute('role','status'); input.placeholder = 'Reason (at least 5 characters)'; input.maxLength = 1000;
    const apply = this.#button('reason-confirm', title, () => { if (input.value.trim().length < 5) { status.textContent = 'Enter at least 5 characters.'; input.focus(); return; } const reason = input.value.trim(); close(); run(reason); }, true);
    dialog.append(element('p', { text: explanation }), input, status, element('div', { className: 'kl-cm-actions' }, this.#button('reason-cancel', 'Cancel', close), apply)); dialog.showModal(); input.focus();
  }
  #channelArchive(ch: Channel, archived: boolean): void {
    const c=this.#community;if(!c)return;
    this.#manage(c,archived?'Archive channel':'Restore channel',`${archived?'Archive':'Restore'} #${ch.name}? ${archived?'Hide this channel and close message access until it is restored. Existing history still expires after 30 days.':'Restore this channel with its existing permissions and remaining history?'}`, `/v1/communities/${c.id}/channels/${ch.id}/archive`,{archived},ch.revision,ch);
  }
  #manage(c:Community,title:string,description:string,path:string,data:Record<string,unknown>,revision:number,channel?:Channel):void {
    if(!this.#valid(this.#token)||this.#loading||this.#busy)return;
    const source=this.#managementSources.get(channel??c);
    this.#managementAction.open({title,description:`${c.name} · ${description}`,communityId:c.id,channelId:channel?.id,path,data,revision,generation:source?.generation,reasonRequired:!!channel});
  }
  #holdManagementRead():void {
    if (this.#contextDrawer || this.#invitationsOpen) this.#closeDialog?.();
    this.#community=undefined;this.#list=[];this.#members=[];this.#archives=[];this.#audit=[];this.#confirm=undefined;
    this.#cursor=null;this.#directoryCursor=null;this.#listKey='';this.#listTarget=20;
    this.#managerLifecycleDraft=undefined;this.#managementAction.invalidateUnauthorized();
    if(this.#managerRoster){this.#managerRoster.request++;this.#managerRoster.items=[];this.#managerRoster.cursor=null;this.#managementAction.hide();this.#communityEditor.refreshManagerPanel();}
    else if(this.#communityEditor.managerTab==='archive')this.#communityEditor.refreshManagerPanel();
  }
  async #uploadImages(): Promise<void> {
    const upload=this.#upload;if(!upload||upload.controller||this.#busy||!this.#visible||this.#channelId!==upload.channel)return;
    const source=this.#channelActions.get(upload.path);if(!source||source.held||source.pending||!source.identity()||this.#selected!==source.target.communityId)return;
    const controller=new AbortController();upload.controller=controller;upload.error='';this.#render();
    try {while(upload.files.length){const file=upload.files[0]!,intents=upload.intents??=new WeakMap();let intent=intents.get(file);if(!intent){intent=new MediaUploadIntent(this.client,file,source.source.generation);intents.set(file,intent);}
      const current=()=>!controller.signal.aborted&&this.#upload===upload&&this.options.current()&&this.#visible&&this.#channelId===upload.channel&&this.#channelActions.get(upload.path)===source&&!source.held&&!source.pending&&source.identity();
      const result=await intent.send(current,{signal:controller.signal,onProgress:percent=>{if(!current())return;upload.progress=percent;const label=this.element.querySelector('.kl-cm-upload-status');if(label)label.textContent=`Uploading · ${percent}%`;}});
      if(controller.signal.aborted||this.#upload!==upload||!this.options.current()||!this.#visible||this.#channelId!==upload.channel)return;
      const action=this.#channelActions.get(upload.path);if(action!==source||source.held||source.pending||!source.identity())return;this.#attachments.get(upload.path)?.mediaIds.push(result.id);upload.files.shift();
    }}catch(error){error=mediaUploadError(error);upload.error=error instanceof MediaGenerationError?error.message:'Upload was not confirmed. Retry or cancel.';}finally{upload.controller=undefined;if(this.#upload===upload)this.#render();}
  }
  async #channelPreference(c:Community,ch:Channel,mode:string):Promise<void>{
    if(!['all','mentions','off'].includes(mode)||this.#busy||this.#loading||this.#channelHold||!this.#valid(this.#token))return;
    const path=`/v1/communities/${c.id}/channels/${ch.id}/preferences`,source=this.#mutationSources.get(ch);if(!source||this.#channelActions.has(path))return;
    const intent=new ChannelMutationIntent(this.client,{kind:'preferences',path,communityId:c.id,channelId:ch.id,revision:ch.preferenceRevision??0,label:`${c.name} / #${ch.name}`},source);this.#channelActions.set(path,intent);await this.#runChannelAction(intent,{mode});
  }
  isReading(channelId: string): boolean {
    if(this.#channelHold||!this.#channelAccess?.current()||this.#historyTimeline.active||!this.#rich||!this.#visible||this.#destroyed||this.#loading||this.#target||this.#historyBefore||this.#channelId!==channelId||!this.client.connected||!this.options.current()||document.visibilityState==='hidden')return false;
    const root=this.element.getRootNode();
    if(document.querySelector('dialog[open]')||(root instanceof ShadowRoot&&root.querySelector('dialog[open]')))return false;
    const messages=this.element.querySelector<HTMLElement>('.kl-cm-messages'),last=messages?.querySelector<HTMLElement>('.kl-cm-message:last-of-type');
    if(!messages||!last||messages.scrollHeight-messages.scrollTop-messages.clientHeight>12)return false;
    const rect=last.getBoundingClientRect(),outer=this.element.getBoundingClientRect();
    return rect.height>0&&rect.top>=Math.max(0,outer.top)&&rect.bottom<=Math.min(window.innerHeight,outer.bottom);
  }
  readonly #scheduleRead=():void=>{clearTimeout(this.#readTimer);this.#readTimer=setTimeout(()=>{const ch=this.#channels.find(c=>c.id===this.#channelId);if(ch&&this.isReading(ch.id)){const latest=this.#messages.at(-1)?.sequence??0;if(latest>(this.#readThrough.get(ch.id)??0))void this.#markRead(ch,latest);}},400);};
  async #markRead(ch: Channel, sequence: number): Promise<void> {
    const access=this.#channelAccess;
    if(!sequence||this.#channelHold||!access?.current()||ch.recoveryGeneration!==access.generation||this.#readPending||this.#loading||!this.#valid(this.#token))return;
    const token=this.#token,pending={};this.#readPending=pending;
    try{await access.request('PUT',`${this.#base()}/channels/${ch.id}/read`,{sequence});if(this.#valid(token)&&access.current()){this.#readThrough.set(ch.id,sequence);this.options.changed?.();await this.refresh(false,true);}}
    catch(error){if(this.#valid(token)){if(channelRecoveryConflict(error))this.#holdChannel();this.#error='Read state could not sync. Read the current channel to retry.';this.#render();}}
    finally{if(this.#readPending===pending)this.#readPending=undefined;}
  }
  async #older(): Promise<void> {
    const access=this.#channelAccess;
    if (this.#busy || this.#loading || this.#channelHold || !access?.current() || this.#messageCursor === null) return;
    const token = this.#token, path = this.#messageBase(), pending = {}; this.#olderPending = pending; this.#busy = true; this.#render();
    try {
      const page = await access.request<Page<Message>>('GET', `${path}?limit=40&cursor=${this.#messageCursor}`);
      if (!this.#valid(token)) return;
      this.#target = undefined; this.#historyBefore = this.#messageCursor; this.#channelScroll = undefined; this.#scrollToChannel = true;
      for(const m of page.items){this.#reportSources.set(m,access);const ch=this.#channels.find(c=>c.id===this.#channelId),source=ch&&this.#mutationSources.get(ch);if(source)this.#mutationSources.set(m,source);}this.#messages = page.items; this.#messageCursor = page.nextCursor;
    } catch (e) { if (this.#valid(token)) { if(channelRecoveryConflict(e))this.#holdChannel(); this.#messages = []; this.#error = this.#errorText(e); } }
    finally { if(this.#olderPending===pending){this.#olderPending=undefined;this.#busy=false;if(!this.#destroyed)this.#render();} }
  }
  #holdChannel(): void {
    for(const a of this.#channelActions.values())a.hold();
    this.#channelHold = !!this.#channelId; this.#channelAccess = undefined;
    if(this.#olderPending){this.#olderPending=undefined;this.#busy=false;}
    clearTimeout(this.#readTimer); this.#readPending = undefined; this.#readThrough.clear();
    this.#messages = []; this.#messageCursor = null; this.#historyBefore = 0; this.#target = undefined;
    this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#closeDialog?.();
    this.#audio.pausePlayback(); this.#mentions.close(); this.#reactions?.pause();
  }
  #hideEditors():void {this.#editorVisible=false;++this.#editEpoch;this.#communityEditor.hide();}
  #reviewEditing():boolean {
    if(this.#communityEditor.unfinished){this.#communityEditor.resume();return true;}
    if(this.#editor?.intent.identity()){this.#editorVisible=true;this.#render();return true;}
    return false;
  }
  #canEditSettings(c:Community):boolean{return c.canManage&&!c.restricted&&!c.archived&&c.membership==='active';}
  #canOwnCommunity(c:Community):boolean{return c.role==='owner'&&c.canManage&&!c.restricted&&c.membership==='active';}
  #canOpenManager(c:Community):boolean{return this.#canEditSettings(c)||c.archived&&this.#canOwnCommunity(c);}
  #archiveCommunity(c:Community):void {
    this.#manage(c,c.archived?'Restore community':'Archive community',c.archived?'Restore this community?':'Archive this community? Channels will become unavailable until it is restored.',`/v1/communities/${c.id}/archive`,{archived:!c.archived},c.revision);
  }
  #managerCommunity(communityId:string,section:CommunityManagerTab):Community|undefined {
    const current=this.#community;
    if(!current||current.id!==communityId||!this.#valid(this.#token)||!this.#managementSources.get(current)?.current())return;
    if(section==='archive')return this.#canOwnCommunity(current)?current:undefined;
    if(!this.#canEditSettings(current)||section==='requests'&&!current.canReview||section==='ownership'&&!this.#canOwnCommunity(current))return;
    return current;
  }
  #lifecycleDraft(c:Community):ManagerLifecycleDraft {
    return {communityId:c.id,revision:c.revision,name:c.name,archived:c.archived,recipient:'',confirmation:''};
  }
  #reconcileManagerLifecycle(c:Community):void {
    const section=this.#communityEditor.managerTab;
    if(section!=='ownership'&&section!=='archive')return;
    if(!this.#managerCommunity(c.id,section)){this.#managerLifecycleDraft=undefined;return;}
    const draft=this.#managerLifecycleDraft;
    if(!draft||draft.communityId!==c.id||draft.revision!==c.revision||draft.name!==c.name||draft.archived!==c.archived)this.#managerLifecycleDraft=this.#lifecycleDraft(c);
  }
  #selectManagerSection(communityId:string,section:CommunityManagerTab):void {
    clearTimeout(this.#managerSearchTimer);
    this.#managerRoster=undefined;
    this.#managerLifecycleDraft=undefined;
    if(section==='settings')return;
    const c=this.#managerCommunity(communityId,section);
    if(!c)return;
    if(section==='ownership'||section==='archive')this.#managerLifecycleDraft=this.#lifecycleDraft(c);
    if(section==='archive')return;
    const roster:ManagerRoster={communityId,section,items:[],cursor:null,search:'',role:'',online:false,recipient:'',target:40,loading:true,error:'',request:0};
    this.#managerRoster=roster;
    void this.#loadManagerRoster(roster,false,false);
  }
  async #loadManagerRoster(roster:ManagerRoster,append=false,paint=true):Promise<void> {
    const c=this.#managerCommunity(roster.communityId,roster.section);
    const source=c&&this.#managementSources.get(c);
    if(!c||!source||this.#communityEditor.managerTab!==roster.section){
      roster.items=[];roster.loading=false;roster.cursor=null;
      this.#managementAction.hide();
      this.#communityEditor.refreshManagerPanel();return;
    }
    clearTimeout(this.#managerSearchTimer);
    const request=++roster.request;
    const current=()=>this.#managerRoster===roster&&this.#communityEditor.managerTab===roster.section&&request===roster.request&&
      this.#managerCommunity(roster.communityId,roster.section)===c&&source.current();
    let cursor=append?roster.cursor??0:0;
    const target=append?40:roster.target;
    roster.loading=true;roster.error='';
    if(!append){roster.items=[];roster.cursor=null;}
    if(paint)this.#communityEditor.refreshManagerPanel();
    try{
      const found:Member[]=[];
      const seen=new Set<number>();
      let nextCursor:number|null=null;
      do {
        seen.add(cursor);
        const query=new URLSearchParams({state:managerMemberState[roster.section],limit:String(Math.min(40,target-found.length)),cursor:String(cursor)});
        if(this.#directoryEnabled&&roster.section==='members'){
          query.set('q',roster.search.trim());query.set('role',roster.role);query.set('online',roster.online?'1':'0');
        }
        const page=await source.request<Page<Member>>('GET',`/v1/communities/${c.id}/members?${query}`);
        if(!current())return;
        found.push(...page.items);
        nextCursor=page.nextCursor;
        if(nextCursor===null||seen.has(nextCursor))break;
        cursor=nextCursor;
      }while(found.length<target);
      roster.items=append?[...roster.items,...found]:found;
      const draft=this.#managerLifecycleDraft;
      if(roster.section==='ownership'&&draft?.communityId===roster.communityId&&draft.recipient&&
        !roster.items.some(member=>String(member.memberNumber)===draft.recipient&&member.state==='active'&&member.role!=='owner'))draft.recipient='';
      if(append)roster.target=Math.max(40,roster.items.length);
      roster.cursor=nextCursor!==null&&!seen.has(nextCursor)?nextCursor:null;
    }catch(error){
      if(this.#managerRoster!==roster||request!==roster.request)return;
      if(moderationGenerationConflict(error)||error instanceof CloudError&&[401,403,404].includes(error.status)){
        roster.items=[];roster.cursor=null;this.#managementAction.hide();
      }
      roster.error=this.#errorText(error);
    }finally{
      if(this.#managerRoster===roster&&request===roster.request){
        roster.loading=false;
        if(roster.section==='ownership')this.#managementAction.invalidateUnauthorized();
        this.#communityEditor.refreshManagerPanel();
      }
    }
  }
  #renderManagerRoster(section:Exclude<ManagerRosterSection,'ownership'>):HTMLElement {
    const roster=this.#managerRoster;
    const c=roster?.section===section?this.#managerCommunity(roster.communityId,section):undefined;
    if(!roster||!c)return element('p',{className:'kl-cm-design-error',text:'This section is unavailable with your current access.'});
    const current=()=>!roster.loading&&this.#managerRoster===roster&&this.#managerCommunity(roster.communityId,section)===c?c:undefined;
    const members=roster.items.map(m=>{
      const controls=element('div',{className:'kl-cm-actions'});
      this.#appendMemberActions(controls,c,m,managerMemberState[section],current,false);
      const avatar = m.avatarId ? this.options.avatar?.(m.avatarId, m.memberNumber === this.client.memberNumber) : undefined;
      return {memberNumber:m.memberNumber,displayName:this.#managerMemberName(m),
        username:m.username??null,roleLabel:roles[m.role],...(m.status?{status:m.status}:{}),
        ...(typeof m.updatedAt==='number'?{updatedAt:m.updatedAt}:{}),
        ...(avatar ? {avatar} : {}),
        ...(m.profileVisible&&this.options.openProfile?{openProfile:()=>{if(current())this.#communityEditor.leaveManager(()=>this.options.openProfile?.(m.memberNumber));}}:{}),
        protectedRole:section==='members'&&(m.memberNumber===this.client.memberNumber||m.role==='owner'),
        ...(controls.childElementCount?{controls}:{}),
      };
    });
    return renderCommunityManagerPanel({section,members,loading:roster.loading,error:roster.error,ownMember:this.client.memberNumber,
      search:roster.search,role:roster.role,online:roster.online,recipient:roster.recipient,filterAvailable:this.#directoryEnabled,
      filter:(search,role,online)=>{
        if(this.#managerRoster!==roster||search===roster.search&&role===roster.role&&online===roster.online)return;
        const immediate=role!==roster.role||online!==roster.online;
        roster.search=search;roster.role=role;roster.online=online;roster.target=40;roster.request++;roster.loading=true;
        clearTimeout(this.#managerSearchTimer);
        if(immediate)void this.#loadManagerRoster(roster);
        else this.#managerSearchTimer=setTimeout(()=>void this.#loadManagerRoster(roster),250);
      },
      recipientChanged:value=>{if(this.#managerRoster===roster)roster.recipient=value;},
      ...(roster.cursor!==null?{more:()=>{if(current())void this.#loadManagerRoster(roster,true);}}:{}),
      ...(roster.error?{retry:()=>void this.#loadManagerRoster(roster)}:{}),
      ...(c.canInvite?{invite:(memberNumber:number)=>{
        if(!current()||this.#loading||this.#busy||!Number.isSafeInteger(memberNumber)||memberNumber<1||memberNumber===this.client.memberNumber)return;
        this.#managementAction.open({title:'Invite member',description:`${c.name} · Invite ${this.#name(memberNumber)} to this community?`,communityId:c.id,path:`/v1/communities/${c.id}/invite`,revision:c.revision,data:{memberNumber},generation:this.#managementSources.get(c)?.generation,membership:true});
      }}:{}),
      ...(c.canReview?{openModeration:()=>{
        if(!current())return;
        this.#communityEditor.leaveManager(()=>{this.#management=true;this.#switchTab(this.#moderationEnabled?'reports':'audit');});
      }}:{}),
    });
  }
  #managerMemberName(member:Member):string {
    return (this.#directoryEnabled?member.displayName:this.options.name(member.memberNumber))||`Member ${member.memberNumber}`;
  }
  #renderManagerPanel(section:CommunityManagerSection):{body:HTMLElement;action?:HTMLElement} {
    if(section!=='ownership'&&section!=='archive')return {body:this.#renderManagerRoster(section)};
    const draft=this.#managerLifecycleDraft,c=draft&&this.#managerCommunity(draft.communityId,section);
    if(!draft||!c){
      const current=this.#community;
      if(current?.role==='admin'&&this.#managerCommunity(current.id,'settings')){
        const body=element('section',{className:'kl-cm-manager-panel kl-cm-lifecycle-panel'});
        body.dataset.communityManagerPanel=section;
        body.append(element('div',{className:'kl-cm-lifecycle-notice'},kikiIcon('lock'),element('span',{},
          element('strong',{text:'Owner access required. '}),
          section==='ownership'?'Only the current owner can transfer ownership.':'Only the current owner can archive or restore this community.')),
          element('p',{className:'kl-cm-manager-note',text:'Your current role is Administrator. Community ownership is separate from ownership of independently created Spaces.'}));
        return {body};
      }
      return {body:element('p',{className:'kl-cm-design-error',text:'This section is unavailable with your current access.'})};
    }
    const roster=this.#managerRoster;
    const candidate=(member:Member)=>member.state==='active'&&member.role!=='owner'&&member.memberNumber!==this.client.memberNumber&&Number.isSafeInteger(member.memberNumber)&&member.memberNumber>0;
    const candidates=section==='ownership'&&roster?.section==='ownership'&&roster.communityId===c.id?roster.items.filter(candidate):[];
    const disabled=this.#loading||this.#busy||!this.#communityEditor.canActInManager(section);
    const setConfirmation=(value:string)=>{if(this.#managerLifecycleDraft===draft)draft.confirmation=value;};
    if(section==='archive')return renderCommunityArchive({name:c.name,archived:c.archived,confirmation:draft.confirmation,disabled,
      onConfirmation:setConfirmation,onReview:confirmation=>this.#reviewManagerLifecycle(draft,section,confirmation),
      onRestore:()=>this.#reviewManagerLifecycle(draft,section,'')});
    return renderCommunityOwnership({name:c.name,candidates:candidates.map(member=>({memberNumber:member.memberNumber,
      name:`${this.#managerMemberName(member)} · #${member.memberNumber}`})),
      recipient:draft.recipient,confirmation:draft.confirmation,loading:!!roster?.loading,error:roster?.error??'',disabled,
      onRecipient:value=>{if(this.#managerLifecycleDraft===draft)draft.recipient=value;},onConfirmation:setConfirmation,
      onReview:(memberNumber,confirmation)=>this.#reviewManagerLifecycle(draft,section,confirmation,memberNumber),
      ...(roster?.cursor!=null?{onMore:()=>{if(!roster.loading&&!disabled)void this.#loadManagerRoster(roster,true);}}:{}),
      ...(roster?.error?{onRetry:()=>{if(!roster.loading&&!disabled)void this.#loadManagerRoster(roster);}}:{}),
      onInvitations:()=>this.#communityEditor.selectManagerTab('invitations'),
    });
  }
  #reviewManagerLifecycle(draft:ManagerLifecycleDraft,section:ManagerLifecycleSection,confirmation:string,memberNumber?:number):void {
    if(this.#loading||this.#busy||!this.#communityEditor.canActInManager(section))return;
    const current=()=>{
      const c=this.#managerCommunity(draft.communityId,section);
      return this.#managerLifecycleDraft===draft&&this.#communityEditor.managerTab===section&&c?.revision===draft.revision&&c.name===draft.name&&c.archived===draft.archived?c:undefined;
    };
    const c=current();
    if(!c||!c.archived&&(confirmation!==c.name||draft.confirmation!==confirmation))return;
    const source=this.#managementSources.get(c);
    if(!source?.current())return;
    if(section==='ownership'){
      const roster=this.#managerRoster;
      const target=roster?.section==='ownership'&&roster.communityId===c.id&&!roster.loading&&!roster.error&&draft.recipient===String(memberNumber)&&
        roster.items.find(member=>member.memberNumber===memberNumber&&member.state==='active'&&member.role!=='owner'&&member.memberNumber!==this.client.memberNumber);
      if(!target||!Number.isSafeInteger(memberNumber)||memberNumber!<1)return;
      const name=this.#managerMemberName(target);
      this.#managementAction.open({title:'Confirm ownership transfer',description:`${c.name} · Make ${name} (#${target.memberNumber}) the owner? You will become an administrator. Independent Space ownership is separate.`,
        communityId:c.id,path:`/v1/communities/${c.id}/ownership`,revision:c.revision,data:{memberNumber:target.memberNumber},generation:source.generation,
        presentation:'manager-review',submitLabel:'Transfer ownership',backLabel:'Back',danger:true,
        reviewBody:()=>renderCommunityLifecycleReview({kind:'ownership',communityName:c.name,memberName:name,memberNumber:target.memberNumber}),
        ready:()=>!roster.loading,
        authorized:()=>!!current()&&source.current()&&this.#managerRoster===roster&&(roster.loading||!roster.error&&roster.items.some(member=>member.memberNumber===target.memberNumber&&member.state==='active'&&member.role!=='owner'))});
      return;
    }
    this.#managementAction.open({title:c.archived?'Restore this community?':'Archive this community?',
      description:c.archived?`${c.name} · Reopen the community with its current members, channels and settings. Invitations still follow their original expiration.`:
        `${c.name} · Pause access to channels and community changes until restored. Stored content follows its usual retention and pending invitations keep their original expiration.`,
      communityId:c.id,path:`/v1/communities/${c.id}/archive`,revision:c.revision,data:{archived:!c.archived},generation:source.generation,
      presentation:'manager-review',submitLabel:c.archived?'Restore community':'Archive community',backLabel:'Back',danger:!c.archived,
      reviewBody:()=>renderCommunityLifecycleReview({kind:c.archived?'restore':'archive',communityName:c.name}),
      authorized:()=>!!current()&&source.current()});
  }
  #restoreManagerActionFocus(action:CommunityManagementAction,applied:boolean):void {
    if(!applied&&action.returnAction&&(!this.#selected||this.#selected===action.communityId)){
      const host=action.returnAction.startsWith('context-membership-')?this.#contextDrawer:this.#content;
      const opener=host?.querySelector<HTMLElement>(`[data-community-action="${CSS.escape(action.returnAction)}"]`);
      opener?.focus({preventScroll:true});return;
    }
    const section=this.#communityEditor.managerTab;
    if(!section||section==='settings')return;
    const lifecycle=section==='ownership'||section==='archive';
    if((lifecycle?this.#managerLifecycleDraft:this.#managerRoster)?.communityId!==action.communityId)return;
    const member=/\/members\/(\d+)$/u.exec(action.path)?.[1];
    const actionName=action.data.action;
    const rowAction=section==='ownership'&&action.path.endsWith('/ownership')?'manager-transfer-review':
      section==='archive'&&action.path.endsWith('/archive')?action.data.archived?'manager-archive-review':'manager-restore':
      member&&typeof actionName==='string'?`${actionName}-${member}`:action.membership&&action.path.endsWith('/invite')?'manager-invite':undefined;
    const opener=!applied&&rowAction?this.#communityEditor.element.querySelector<HTMLElement>(`[data-community-action="${rowAction}"]`):undefined;
    (opener??this.#communityEditor.element.querySelector<HTMLElement>(`[data-community-action="manager-${section}"]`))?.focus({preventScroll:true});
  }
  #managerNavigation(c:Community,returnAction:string):CommunityManagerNavigation {
    return {initial:c.archived?'archive':'settings',sections:[
      {id:'settings',label:'Settings'},
      {id:'members',label:'Members'},
      {id:'invitations',label:'Invitations'},
      {id:'requests',label:'Requests'},
      {id:'ownership',label:'Ownership'},
      {id:'archive',label:'Archive'},
    ],select:section=>this.#selectManagerSection(c.id,section),panel:section=>this.#renderManagerPanel(section),
    permitted:section=>!!this.#managerCommunity(c.id,section)||
      (section==='ownership'||section==='archive')&&this.#managerCommunity(c.id,'settings')?.role==='admin',
    dirty:()=>{const draft=this.#managerLifecycleDraft;return !!draft&&draft.communityId===c.id&&!!(draft.recipient||draft.confirmation);},
    returnFocus:()=>this.#selected===c.id&&this.#visible?this.#content.querySelector<HTMLElement>(`[data-community-action="${returnAction}"]`):null};
  }
  #editCommunity(c?:Community,source?:CommunityEditSource,focusField:'name'|'announcement'='name',returnAction=focusField==='announcement'?'edit-announcement':'manage',section?:'members'|'ownership'):void {
    if(this.#reviewEditing()||!this.#valid(this.#token)||this.#busy||c&&(!(this.#customizationEnabled?this.#canOpenManager(c):this.#canEditSettings(c))||c!==this.#community||this.#loading))return;
    source??=c?this.#editingSources.get(c):undefined;if(!source)return;
    if(this.#customizationEnabled){
      if(c)this.#management=false;
      this.#communityEditor.open(c,focusField,source,c?this.#managerNavigation(c,returnAction):undefined);
      if(section)this.#communityEditor.selectManagerTab(section);
      this.#render();return;
    }
    const draft={name:c?.name??'',description:c?.description??'',language:c?.language??'English',access:c?.access??'request',discoverable:String(c?.discoverable??true),invitationPermission:c?.invitationPermission??'admins',rules:c?.rules.join('\n')??''};
    this.#editor={kind:'community',id:c?.id,communityName:c?.name??'New community',draft,baseline:JSON.stringify(draft),intent:new CommunityEditIntent(this.client,{method:c?'PUT':'POST',path:c?`/v1/communities/${c.id}`:'/v1/communities',communityId:c?.id,revision:c?.revision},source),status:'',discard:false};this.#editorVisible=true;++this.#editEpoch;this.#render();
  }
  #editChannel(c:Community,ch?:Channel):void {
    if(this.#reviewEditing()||!this.#valid(this.#token)||this.#busy||!c.canManage||c.archived||c.membership!=='active')return;
    const source=this.#editingSources.get(ch??c);if(!source)return;
    const draft={name:ch?.name??'',topic:ch?.topic??'',visibility:ch?.visibility??'members',posting:ch?.posting??'members',members:ch?.members?.join(', ')??''};
    this.#editor={kind:'channel',id:ch?.id,communityName:c.name,draft,baseline:JSON.stringify(draft),intent:new CommunityEditIntent(this.client,{method:ch?'PUT':'POST',path:`/v1/communities/${c.id}/channels${ch?`/${ch.id}`:''}`,communityId:c.id,channelId:ch?.id,channel:true,revision:c.revision},source),status:'',discard:false};this.#editorVisible=true;++this.#editEpoch;this.#render();
  }
  #renderEditor(root:HTMLElement):void {
    const editor=this.#editor!,d=editor.draft,intent=editor.intent;if(!intent.identity())return;
    const current=()=>this.#editor===editor&&this.#editorVisible&&!this.#destroyed&&this.#visible&&this.options.current()&&intent.identity();
    const form=element('form',{className:'kl-cm-editor',ariaLabel:editor.kind==='community'?'Community settings':'Channel settings'});
    form.append(element('h2',{text:editor.kind==='community'?editor.id?'Community settings':'Create community':editor.id?'Channel settings':'Create channel'}),element('p',{className:'kl-cm-editor-source',text:editor.communityName}));
    const field=(key:string,label:string,max:number,choices?:Record<string,string>,multiline=false)=>{
      const input=choices?element('select'):multiline?element('textarea'):element('input');input.dataset.communityField=key;input.setAttribute('aria-label',label);
      if(choices)for(const[value,text]of Object.entries(choices)){const o=element('option',{text});o.value=value;input.append(o);}
      if(input instanceof HTMLInputElement||input instanceof HTMLTextAreaElement){input.maxLength=max;if(input instanceof HTMLInputElement)input.type='text';input.readOnly=!!intent.pending||intent.held;}
      input.value=d[key]??'';input.disabled=this.#editorBusy||(input instanceof HTMLSelectElement&&(!!intent.pending||intent.held));
      const update=()=>{if(input.isConnected&&current()&&!this.#editorBusy&&!intent.pending&&!intent.held)d[key]=input.value;};input.addEventListener('input',update);input.addEventListener('change',update);
      form.append(element('label',{},element('span',{text:label}),input));
    };
    if(editor.kind==='community'){
      field('name','Community name',64);field('description','Short description',180,undefined,true);field('language','Primary language',40);
      field('access','Access',0,{public:'Public — anyone can join',request:'Request only — approval required',private:'Private — invitation required'});
      field('discoverable','Show in discovery',0,{true:'Yes — name and description only',false:'No — members and invitees only'});
      field('invitationPermission','Who can invite?',0,{admins:'Administrators only',members:'All members'});field('rules','Rules — one per line, up to 8',1447,undefined,true);
    }else{
      field('name','Channel name',64);field('topic','Topic',180);field('visibility','Who can view?',0,{members:'Community members',staff:'Community team',selected:'Selected members and administrators'});
      field('members','Selected Member Numbers — separated by commas',1200);field('posting','Who can post?',0,{members:'Everyone with access',staff:'Community team only'});
    }
    const error=element('p',{className:'kl-cm-form-error',text:intent.held?'This draft belongs to an earlier or unverified community state. Copy its fields, then explicitly discard it and reopen current information.':editor.status});form.append(error);
    const save=()=>{
      if(!form.isConnected||!current()||this.#busy||intent.held)return;let data:Record<string,unknown>;
      if(editor.kind==='community'){
        const rules=(d.rules??'').split('\n').map(r=>r.trim()).filter(Boolean);
        if(!(d.name??'').trim()||!(d.language??'').trim()||rules.length>8||rules.some(r=>r.length>180)){error.textContent='Enter a name and language; use up to 8 rules of 180 characters.';return;}
        data={...d,rules,discoverable:d.discoverable==='true'};
      }else{
        const numbers=(d.visibility==='selected'?d.members??'':'').split(',').map(v=>v.trim()).filter(Boolean).map(Number);
        if(numbers.some(n=>!Number.isSafeInteger(n)||n<=0)||new Set(numbers).size!==numbers.length||numbers.length>100){error.textContent='Enter valid, distinct Member Numbers.';return;}
        if(!(d.name??'').trim()){error.textContent='Enter a channel name.';return;}data={...d,members:numbers};
      }
      void this.#saveEditor(editor,data);
    };
    const clear=()=>{if(!current()||this.#editorBusy)return;this.#editor=undefined;this.#editorVisible=false;++this.#editEpoch;this.#render();};
    const cancel=()=>{if(!current()||this.#editorBusy)return;if(intent.pending||JSON.stringify(d)!==editor.baseline){editor.discard=true;this.#render();}else clear();};
    const submit=this.#button('save',intent.pending?'Retry save':'Save',save,true);submit.disabled ||=intent.held;
    form.append(element('div',{className:'kl-cm-actions'},submit,this.#button('cancel-editor','Cancel',cancel)));
    if(editor.discard)form.append(element('section',{className:'kl-cm-discard'},element('p',{text:intent.pending?'This save may already have completed. Discarding this local attempt cannot undo it.':'Discard your changes?'}),this.#button('keep-editing','Keep editing',()=>{editor.discard=false;this.#render();}),this.#button('keep-editor-later','Close and keep',()=>{editor.discard=false;this.#hideEditors();this.#render();}),this.#button('discard-editor','Discard changes',clear)));
    form.addEventListener('submit',event=>{event.preventDefault();save();});root.append(form);
  }
  async #saveEditor(editor:CommunityFormDraft,data:Record<string,unknown>):Promise<void> {
    const epoch=this.#editEpoch,current=()=>epoch===this.#editEpoch&&this.#editor===editor&&this.#editorVisible&&this.#visible&&!this.#destroyed&&this.options.current();
    this.#editorBusy=true;editor.status='';this.#render();
    try{
      const receipt=await editor.intent.send(data,current);if(!receipt||!current())return;
      this.#editor=undefined;this.#editorVisible=false;++this.#editEpoch;this.#selected=receipt.communityId;
      if(receipt.channelId){this.#tab='channels';this.#channelId=receipt.channelId;this.#scrollToChannel=true;}this.options.changed?.();await this.refresh();
    }catch(error){if(this.#editor===editor&&editor.intent.identity())editor.status=error instanceof CloudError&&error.code==='revision_conflict'?'This community changed. The original draft and save are kept. Explicitly discard this attempt and reopen current settings before making a new save.':'The save could not be confirmed. Its original fields and operation are kept; retry when connected.';}
    finally{this.#editorBusy=false;if(!this.#destroyed)this.#render();}
  }
}
