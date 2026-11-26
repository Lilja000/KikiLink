import { focusPageResults, pageResult } from './page-result-focus';
import { pageAction } from './page-action';
import { removableFilter } from './applied-filter';
import { sectionLink } from './section-link';
import { ShellActionMenu, type ShellAction } from './action-menu';
import { spaceAppearance, type SpaceIcon, type SpaceColor } from '../../../cloud/shared/space-appearance.mjs';
import { spaceShareUrl } from './space-share';
import { SpaceNotes } from './space-notes';
import { targetReportDialog } from '../../cloud/target-report-dialog';
import { captureReportSource, type ReportSource } from '../../cloud/report-source';
import {SpaceMutationIntent,SpaceRecoveryError,spaceChangeText,pendingSpaceChanges,clearSpaceChanges,spaceRead,spaceReadAt,sameSpaceSource,type SpaceRecoverySource} from '../../cloud/space-mutation-intent';
import {communityManagementRead} from '../../cloud/moderation-generation';
import {openingRoom} from './space-room-opening';
import {SpaceRoomCreationReview} from './space-room-creation';
import type {BCRoomCreationDraft} from '../../bc/room-creation';
import {workshopColor} from '../../core/workshop-destinations';
import { BrowseFilters, iconButton, searchField } from './browse-controls';
import { shareLinkFields } from './share-link-fields';
import { fitPanelDialog } from './panel-dialog-layout';
import { revealDetailSection } from './detail-section-navigation';
import { observedSpaceRoom, spaceDirectoryStatus, spaceRoomIdentity, spaceRoomKey, visibleSpaces, type SpaceDirectorySort, type SpaceDirectoryStatus, type SpaceRoomObservation } from './space-directory';
import {AlbumsPanel} from './albums-panel';
import { CloudClient, CloudError } from '../../cloud/client';
import { element as makeElement } from '../../cloud/dom';
import { bindClockText } from '../../core/time-format';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';

type Props = NonNullable<Parameters<typeof makeElement>[1]> & { disabled?: boolean; onClick?: () => void };
function element<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Array<Node | string | undefined>): HTMLElementTagNameMap[K] {
  const { disabled, onClick, ...base } = props, node = makeElement(tag, base, ...children);
  if (disabled) node.setAttribute('disabled', '');
  if (onClick) node.addEventListener('click', onClick);
  return node;
}
export interface SpaceRoom { restoreOnOpen?:boolean; description?:string;palette?:{primary:string;secondary:string}|null;name: string; searchSpace: '' | 'X' | 'M'; background: string; capacity: number }
export interface SpacePreset { id: string; label: string; room: SpaceRoom }
export interface PersistentSpace {
  icon?: SpaceIcon; color?: SpaceColor;
  recoverySource?:SpaceRecoverySource;
  id: string; owner: number; communityId: string | null; communityName: string | null; communityPublicAllowed?: boolean;
  name: string; description: string; language: string; tags: string[]; access: 'public' | 'request' | 'private';
  discoverable: boolean; archived: boolean; spaceArchived: boolean; revision: number; updatedAt: number; createdAt: number;
  membership: string; role: 'owner' | 'admin' | 'moderator' | 'member' | null; canRead: boolean; canManage: boolean;
  canJoin: boolean; canTransfer: boolean; canRestore: boolean; memberCount: number | null;
  saved: boolean; preferencesRevision: number; announcement?: string; rules?: string[];
  room?: SpaceRoom | null; presets?: SpacePreset[];
}
export interface SpaceRoomStatus { name: string; memberCount: number; memberLimit: number; canJoin: boolean; locked: boolean }
interface Options {
  directory?: boolean;
  policy?(): 'always'|'ask'|'never'; current(): boolean; name(member: number): string; openProfile(member: number): void;
  member?(member: number, withAvatar?: boolean): { name: string; username?: string; status?: string; searchable?: boolean; avatar?: HTMLElement };
  openCommunity(id: string): void; openEvents(id?: string): void; openLobbies(): void;
  openSpaceEvents?(id: string, name: string): void; openEvent?(id: string): void;
  openHistory?(): void; notes?: SpaceNotes;
  openSpace?(id: string): void;
  createEventsPanel?(): {element: HTMLElement; openSpace(id: string, name?: string): boolean; setVisible(value: boolean): void; destroy(): void} | undefined;
  onRoomRouteChange?(): void;
  prepareRoom?(room: SpaceRoom, space: PersistentSpace): Promise<void>;
  createRoom?(draft: BCRoomCreationDraft, space: PersistentSpace, current: ()=>boolean): Promise<void>;
  currentRoom(): SpaceRoom | null; checkRoom(room: SpaceRoom): Promise<SpaceRoomStatus | null>;
  checkDirectoryRooms?(rooms: readonly SpaceRoom[]): Promise<ReadonlyMap<string, SpaceRoomStatus | null>>;
  joinRoom(room: SpaceRoom, valid: () => boolean, spaceId: string, source?: SpaceRecoverySource): Promise<void>; changed(): void;
}
interface Host { id: string; name: string; publicAllowed: boolean }
interface Member { memberNumber: number; role: string; state: string }
interface Audit { sequence: number; actor: number; action: string; target: number | null; createdAt: number }
interface SpaceEvent { id: string; title: string; startsAt: number; endsAt: number; status: string; spaceId?: string | null }
interface NoteDraft {id:string;name:string;baseline:string;value:string;error:string;discard:boolean;latest?:string}
interface Page<T, Cursor = number> { items: T[]; nextCursor: Cursor | null }
interface Draft {
  name: string; description: string; language: string; tags: string; communityId: string;
  access: string; discoverable: string; announcement: string; rules: string;
  roomName: string; roomDescription: string; roomPalette: SpaceRoom['palette']; searchSpace: string; background: string; capacity: string; restoreOnOpen: string; presets: SpacePreset[];
}
type QuickSpaceEdit = 'announcement' | 'preset';
interface Editor { source:SpaceRecoverySource; held?:boolean; space?: PersistentSpace; draft: Draft; baseline: string; step: number; error: string; conflict?: PersistentSpace; discard?: boolean; roomDetails?: boolean; onCancel?: () => void; quick?: QuickSpaceEdit; presetName?: string; roomEntry?: boolean }
type RoomCheckResult = { status: SpaceRoomStatus | null } | { error: string };
interface PresetReview { space: PersistentSpace; preset: SpacePreset }
interface Pending { intent?:SpaceMutationIntent; discard?:boolean; method: 'POST' | 'PUT'; path: string; body: Record<string, unknown>; done: (receipt: { spaceId: string }) => void | (() => void) }
const BASE = '/v1/spaces';
const announcementLimit = 400;
const presetNameLimit = 60;
const roomPresetLimit = 8;
const presetLimitNotice = 'This Space has reached its limit of 8 presets.';
const roomSettingsTrigger = '.kl-sp-room-settings';
const roomSetupTrigger = '.kl-sp-room-setup';
const roomEntryTrigger = '.kl-sp-room-entry';
const roomCheckTrigger = '.kl-sp-room-check';
const roomStatusLabels = { open: 'Open', full: 'Full', closed: 'Closed', '': 'Status unknown' };
const detailTablist = '.kl-sp-detail > .kl-sp-tabs';
const detailPanelId = 'kl-sp-tab-panel';
const quickEditTriggers: Record<QuickSpaceEdit, { tab: string; selector: string }> = {
  announcement: { tab: 'overview', selector: '.kl-sp-announcement-edit' },
  preset: { tab: 'room', selector: '.kl-sp-save-current-room' },
};
const roomStatusNote = 'Room status uses your last BC check. Unlisted or private rooms have unknown status.';
const accessLabel = (value: string): string => value === 'request' ? 'Request only' : value === 'private' ? 'Private' : 'Public';
const roomIllustrations = new Map([
  ['velvet', '0'], ['lounge', '0'], ['cafe', '1'], ['café', '1'], ['garden', '2'],
  ['studio', '3'], ['atelier', '3'], ['theatre', 'theatre'], ['theater', 'theatre'], ['night', 'night'],
]);
const failure = (error: unknown): string => {
  if(error instanceof SpaceRecoveryError)return error.message;
  if (!(error instanceof CloudError)) return 'The result is not confirmed. Retry the same request.';
  const labels: Record<string, string> = {
    recovery_generation_required: 'This Space changed after recovery. Refresh it and review the original action.',
    space_unavailable: 'This space is no longer available.', space_membership_required: 'Join this space to see its room and members.',
    space_admin_required: 'You no longer manage this space.', space_archived: 'This space is archived. Changes are paused.',
    community_membership_required: 'Join the community first.', community_archived: 'This community is archived.',
    community_role_required: 'You no longer manage this community.', private_community_space: 'Choose request only or private for this community.',
    revision_conflict: 'This space changed. Review the latest details.', preferences_conflict: 'Your saved spaces changed on another device. Try again.',
    invitation_unavailable: 'This invitation is no longer valid. Ask a current administrator for a new invitation.',
    space_invitation_required: 'An invitation is required.', space_full: 'This space has reached its member limit.',
    recipient_unavailable: 'This person is unavailable.', transfer_ownership_first: 'Transfer ownership before leaving.',
    invalid_space_directory_cursor: 'This list expired or changed. Refresh spaces to start again.',
    space_owner_limit: 'You already own 20 spaces.', review_join_request: 'Review this person’s join request instead.',
  };
  return labels[error.code] ?? (error.status === 401 ? 'Reconnect to Cloud to continue.' : error.status === 429 ? 'Please wait a moment and try again.' : 'Could not save this change. Refresh and try again.');
};

/** Persistent metadata stays separate from native BC room discovery and admission. */
export class SpacesPage {
  readonly element = element('section', { className: 'kl-spaces-page', ariaLabel: 'Spaces', hidden: true });
  readonly #heading = element('header', { className: 'kl-sp-heading' });
  readonly #toolbar = element('div', { className: 'kl-sp-toolbar' });
  readonly #scopeRow = element('div', { className: 'kl-sp-directory-controls' });
  readonly #tabs = element('div', { className: 'kl-sp-tabs', role: 'group', ariaLabel: 'Space filters' });
  readonly #activeFilters = element('div', { className: 'kl-sp-active-filters' });
  readonly #status = element('div', { className: 'kl-sp-status', role: 'status' });
  readonly #results = element('div', { className: 'kl-sp-results' });
  readonly #dialog = element('dialog', { className: 'kl-sp-dialog', ariaLabel: 'Space dialog' });
  readonly #infoDialog = element('dialog', { className: 'kl-sp-dialog kl-sp-info-dialog', ariaLabel: 'Space information' });
  readonly #menu = new ShellActionMenu();
  readonly #exploreMenu = new ShellActionMenu('explore');
  readonly #memberMenu = new ShellActionMenu('explore');
  readonly #search = element('input', { type: 'search', ariaLabel: 'Search spaces', placeholder: 'Search spaces…' });
  readonly #language = element('input', { type: 'search', ariaLabel: 'Filter by language', placeholder: 'Any language' });
  readonly #unsubscribe: () => void;readonly #owner:number;readonly #origin:string;
  readonly #searchBox:HTMLElement;readonly #filters:BrowseFilters;readonly #context=element('div',{className:'kl-browse-context'});
  readonly #sortControl: HTMLSelectElement;
  readonly #checkRooms: HTMLButtonElement;
  #directory = false; #sort: SpaceDirectorySort = 'recommended'; #roomFilter: SpaceDirectoryStatus = '';
  #directoryToken = 0; #directoryBusy = false; #directoryError = '';
  #catalogLoadError = '';
  #observations = new Map<string, SpaceRoomObservation>();
  #resumeScroll: number | undefined;
  #communityName='';#pages=1;#queryKey='';#listScroll=0;#returnId:string|undefined;#restoreList=false;
  #communityCanHost = false;
  readonly #albums: AlbumsPanel;
  #backgroundRead = false; #visible = false; #destroyed = false; #supported = false; #roomOpening = false; #roomThemes = false; #loading = false; #busy = false; #error = '';
  #token = 0; #epoch = 0; #roomToken = 0; #scope = 'all'; #tab = 'overview'; #memberState = 'active';
  #paintedRoom: string | undefined;
  #selected: string | undefined; #communityId: string | undefined; #space: PersistentSpace | undefined;
  #items: PersistentSpace[] = []; #members: Member[] = []; #audit: Audit[] = []; #auditPreviewError = ''; #hosts: Host[] = [];
  #memberQuery = ''; #memberRole = ''; #membersError = ''; #memberSearchTimer: ReturnType<typeof setTimeout> | undefined;
  #cursor: number | string | null = null; #detailCursor: number | null = null;
  #source:SpaceRecoverySource={required:false};
  #editor: Editor | undefined; #pending: Pending | undefined;
  #presetReview: PresetReview | undefined;
  #roomSetup: { current(): boolean; cancel(): void } | undefined;
  #roomEntry: { current(): PersistentSpace | undefined; cancel(): void } | undefined;
  #roomCheck: { current(): PersistentSpace | undefined; cancel(): void } | undefined;
  #roomStatus: SpaceRoomStatus | null | undefined; #roomBusy = false;
  #release: (() => void) | undefined; #timer: ReturnType<typeof setInterval> | undefined;
  #searchTimer: ReturnType<typeof setTimeout> | undefined;
  #spaceEvents = false; #upcoming: SpaceEvent[] = []; #eventsError = '';
  #eventsPanel: ReturnType<NonNullable<Options['createEventsPanel']>>; #eventsPanelSpace: string | undefined;
  #eventsReveal: MutationObserver | undefined;
  #infoToken = 0;
  #contextSpaceId: string | null | undefined;
  #noteDraft: NoteDraft | undefined; #notes: SpaceNotes;
  #spaceModerators=false; #spaceReports=false; #reportSource: ReportSource | undefined;
  #reportDialog: HTMLDialogElement | undefined; #reportState={busy:false,pending:false,dirty:false};
  constructor(readonly client: CloudClient, readonly options: Options) {
    this.#notes=options.notes??new SpaceNotes(undefined,client.memberNumber,client.origin,options.current);
    this.#menu.element.id = 'kl-space-member-management-menu';
    this.#memberMenu.element.id = 'kl-space-member-options-menu';
    this.#memberMenu.element.classList.add('kl-sp-member-options', 'kl-explore-detail-options');
    this.#memberMenu.element.addEventListener('close', () => this.#clearClosedMemberMenu());
    this.#infoDialog.addEventListener('cancel', event => { event.preventDefault(); this.#requestInfoClose(); });
    this.#infoDialog.addEventListener('keydown', event => event.stopPropagation());
    this.#owner=client.memberNumber;this.#origin=client.origin;
    this.element.dataset.directory = String(!!options.directory);
    this.#albums = new AlbumsPanel(client, {current:options.current, ...(options.policy?{policy:options.policy}:{})});
    this.#search.maxLength = 80; this.#language.maxLength = 40;
    this.#searchBox=searchField(this.#search, 'Clear Space search');
    this.#sortControl = this.#select('Sort spaces', [['recommended','Recommended'],['active','Active'],['newest','Newest']], this.#sort, value => {
      if (!this.#sortControl.isConnected || this.#sortControl.disabled || !this.#visible || !this.options.current()) return;
      this.#sort = value as SpaceDirectorySort; this.#render();
      if (this.#sort === 'active') void this.#checkDirectoryRooms();
    });
    this.#checkRooms = options.directory
      ? this.#infoButton('Check room status', () => {
        if (!this.#visible || this.#selected) return;
        this.#closeInfo();
        void this.#checkDirectoryRooms();
      })
      : iconButton('Check room status', 'eye', () => void this.#checkDirectoryRooms());
    if (options.directory) this.#checkRooms.prepend(kikiIcon('eye'));
    this.#filters=new BrowseFilters(options.directory?'Filter rooms':'Filter spaces',[
      {key:'scope',label:options.directory?'Show rooms':'Show spaces',presentation:'chips',choices:[['all','All'],['mine','My spaces'],['saved','Saved'],['invites','Invitations']]},
      {key:'language',label:'Language',placeholder:'Any language',maxLength:40},
      {key:'status',label:'Room status',choices:[['','All rooms'],['open','Open'],['full','Full'],['closed','Closed']]},
    ],values=>{const changed=this.#language.value!==values.language||this.#scope!==values.scope;
      this.#scope=values.scope!;this.#language.value=values.language!;this.#roomFilter=values.status as SpaceDirectoryStatus;
      if(changed)this.#resetDirectory();
      const checkRooms = this.#roomFilter && this.options.checkDirectoryRooms;
      if(checkRooms||changed)clearTimeout(this.#searchTimer);
      if(checkRooms||!changed)this.#render();
      if(checkRooms)void this.#checkDirectoryRooms();else if(changed)void this.refresh();
    },{submitLabel:options.directory?'Show rooms':'Show spaces'});
    for (const [value, label] of [['all', 'All'], ['mine', 'My spaces'], ['saved', 'Saved'], ['invites', 'Invitations']] as const) {
      const button = this.#button(label, () => { this.#scope = value; this.#resetDirectory(); void this.refresh(); });
      button.dataset.scope = value;
      this.#tabs.append(button);
    }
    if (!options.directory) this.#tabs.append(this.#button('Lobbies',()=>options.openLobbies(),'location'));
    this.#toolbar.append(this.#searchBox, this.#filters.button);
    this.#scopeRow.append(this.#tabs, element('div', { className: 'kl-sp-sort-tools' },
      element('label', { className: 'kl-sp-sort' }, 'Sort', this.#sortControl),
      ...(options.directory ? [] : [this.#checkRooms])));
    this.element.append(this.#heading, this.#context, this.#toolbar, this.#scopeRow, this.#activeFilters, this.#status, this.#results, this.#dialog,this.#filters.dialog,this.#infoDialog,this.#menu.element,this.#exploreMenu.element,this.#memberMenu.element);
    for (const input of [this.#search, this.#language]) {
      input.addEventListener('input', () => { ++this.#token;this.#resetDirectory();clearTimeout(this.#searchTimer); this.#searchTimer = setTimeout(() => void this.refresh(), 250); });
      input.addEventListener('keydown', event => event.stopPropagation());
    }
    this.#dialog.addEventListener('cancel', event => { event.preventDefault(); this.#requestClose(); });
    this.#dialog.addEventListener('keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    this.#unsubscribe = client.subscribe((kind, cause) => {
      if (kind === 'profiles-cleared' && cause === 'ready') return;
      if (kind === 'session' || !options.current()) {
        const sameAccount=options.current()&&client.memberNumber===this.#owner&&client.origin===this.#origin,preserve=sameAccount&&!!(this.#editor?.source.generation||this.#pending?.intent||pendingSpaceChanges(client).length||this.#noteDraft&&this.#noteDraft.value!==this.#noteDraft.baseline||this.#reportState.dirty||this.#reportState.pending||this.#reportState.busy);
        this.#epoch++; this.#token++; this.#roomToken++;if(!sameAccount){clearSpaceChanges(this.client);this.#source={required:false};}if(!preserve)this.#pending=undefined;this.#busy=false;
        this.#roomBusy = false; this.#loading = false; this.#supported = false; this.#error = ''; this.#hosts = [];
        this.#clearPrivate(preserve); this.#render();
      }
      if(this.#contextSpaceId===null&&['spaces','communities','relationships','profiles-cleared'].includes(kind))this.#closeInfo(true);
      if (kind.startsWith('profile:') && this.#visible && this.#tab === 'members' && this.#space && this.#activeSpace(this.#space)?.canRead) this.#paintMemberRows(this.#space);
      if (this.#visible && ['session', 'ready', 'spaces', 'communities', 'relationships', 'profiles-cleared'].includes(kind)) void this.refresh(false, true);
    });
    this.#render();
  }
  notifyMediaPolicyChanged(): void { this.#albums.notifyPolicyChanged(); }
  setVisible(visible: boolean): void {
    this.#setVisible(visible);
  }
  #setVisible(visible: boolean, reload = true): void {
    if (!visible && this.#visible) this.#resumeScroll = this.element.scrollTop;
    this.element.hidden = !visible;
    if (this.#visible === visible || this.#destroyed) return;
    this.#visible = visible;
    if (visible) {
      this.#release = this.client.retainEvents();
      this.#timer = setInterval(() => void this.refresh(false, true), 30000);
      if (reload) void this.refresh();
    } else {
      ++this.#token; ++this.#roomToken; this.#filters.close();this.#roomBusy = false; clearInterval(this.#timer); clearTimeout(this.#searchTimer); clearTimeout(this.#memberSearchTimer);
      this.#release?.(); this.#release = undefined; this.#clearPrivate(true); this.#results.replaceChildren(); this.#loading = false;
      this.#notifyRoomRoute();
    }
  }
  async create(): Promise<void> {
    if (!this.#visible || this.#busy || this.#pending || this.#editor) return;
    const token = this.#token + 1;
    await this.refresh();
    if (token === this.#token && this.#visible && this.#supported && this.client.connected && this.options.current() && !this.#editor) this.#edit();
  }
  open(id?: string, communityId?: string): void {
    this.#open(id, communityId);
  }
  openRoom(id: string): void {
    if (!this.#open(id, undefined, false)) return;
    this.#tab = 'room';
    void this.refresh();
  }
  showingRoom(id: string): boolean {
    return this.#visible && this.#selected === id && this.#tab === 'room';
  }
  #notifyRoomRoute(): void {
    const room = this.#visible && this.#tab === 'room' ? this.#selected : undefined;
    if (room !== this.#paintedRoom) { this.#paintedRoom = room; this.options.onRoomRouteChange?.(); }
  }
  #open(id?: string, communityId?: string, reload = true): boolean {
    if (this.#busy || this.#pending || this.#editor?.source.generation || this.#resumePersonalDraft()) return false;
    this.#filters.close();clearTimeout(this.#searchTimer);this.#clearPrivate();this.#resumeScroll=undefined;this.#communityName='';this.#pages=1;this.#restoreList=false;this.#returnId=undefined; this.#selected = id; this.#communityId = communityId; this.#tab = 'overview';
    this.#search.value = ''; this.#language.value = ''; this.#scope = 'all'; this.#sort='recommended';this.#roomFilter='';this.#resetDirectory();
    this.#setVisible(true, false);
    if (reload) void this.refresh();
    return true;
  }
  async createForCommunity(communityId: string, onCancel?: () => void): Promise<void> {
    if (this.#destroyed || !this.options.current() || !this.client.connected || this.client.memberNumber !== this.#owner || this.client.origin !== this.#origin || this.#busy) return;
    this.#restorePending();
    if (this.#pending) return;
    if (this.#editor) {
      this.setVisible(true);
      this.#paintEditor();
      this.#showDialog();
      return;
    }
    if (!this.#open(undefined, communityId, false)) return;
    const token = this.#token + 1;
    const current = () => this.#valid(token) && this.#communityId === communityId && !this.#selected && !this.#busy && !this.#pending && !this.#editor;
    await this.refresh();
    if (!current() || !this.#supported || this.#error || this.#catalogLoadError) return;
    if (!this.#communityCanHost || !this.#hosts.some(host => host.id === communityId)) {
      this.#error = 'You no longer manage this community.';
      this.#paintStatus();
      return;
    }
    try {
      const linked = await spaceReadAt(this.client, this.#source)<Page<PersistentSpace>>(`${BASE}?scope=mine&communityId=${communityId}&limit=1`);
      if (!current()) return;
      if (linked.items.length || linked.nextCursor != null) {
        this.#error = 'This community already has a linked Space.';
        this.#paintStatus();
        return;
      }
    } catch {
      if (!current()) return;
      this.#error = 'Linked Spaces could not be checked. Try again.';
      this.#paintStatus();
      return;
    }
    this.#edit(undefined, onCancel ? { onCancel } : undefined);
  }
  /** The Rooms heading can open its drawer without changing the current directory mode. */
  openContext(): void {
    if(this.#destroyed||!this.element.isConnected||!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
    this.#information(this.#visible?this.#space:undefined);
  }
  closeContext(): void { this.#closeInfo(true); }
  #openCard(id:string):void{if(this.#busy||this.#pending)return;if(this.#resumePersonalDraft())return;if(this.#editor?.source.generation){this.#paintEditor();this.#showDialog();return;}this.#listScroll=this.element.scrollTop;this.#returnId=id;this.#clearPrivate();this.#selected=id;this.#tab='overview';clearTimeout(this.#searchTimer);void this.refresh();this.element.scrollTop=0;}
  #backToList():void{if(this.#resumePersonalDraft())return;this.#selected=undefined;this.#space=undefined;this.#tab='overview';this.#roomToken++;this.#albums.setVisible(false);this.#eventsPanel?.setVisible(false);this.#closeInfo();this.#restoreList=true;void this.refresh();}
  destroy(): void { this.setVisible(false);this.#closeInfo(); this.#memberMenu.destroy();this.#menu.destroy();this.#exploreMenu.destroy(); this.#eventsPanel?.destroy();this.#hideReport(true); this.#destroyed = true; this.#epoch++; this.#unsubscribe(); this.#albums.destroy();clearSpaceChanges(this.client); this.#pending = undefined; this.element.replaceChildren(); }
  #closeMenus(restoreMemberFocus = false): void {
    this.#closeMemberMenu(restoreMemberFocus);
    this.#menu.close(false);
    this.#exploreMenu.close(false);
  }
  #closeMemberMenu(restoreFocus: boolean): void {
    const restore = restoreFocus && this.#valid(this.#token) && this.#memberMenu.element.contains(this.#activeElement());
    this.#memberMenu.close(restore);
    this.#clearClosedMemberMenu();
  }
  #clearClosedMemberMenu(): void {
    if (this.#memberMenu.element.open) return;
    this.#memberMenu.element.replaceChildren();
    this.#memberMenu.element.removeAttribute('aria-label');
  }
  #clearPrivate(preserve=false): void { this.#cancelEventsReveal(); this.#closeMenus(); clearTimeout(this.#memberSearchTimer); this.#memberQuery=''; this.#memberRole=''; this.#memberState='active'; this.#membersError=''; this.#detailCursor=null; const keep=preserve&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;this.#closeInfo(keep);this.#hideReport(!keep);this.#upcoming=[];this.#eventsError='';this.#eventsPanel?.setVisible(false);this.#eventsPanelSpace=undefined; this.#forgetRoomObservations();this.#filters.close();this.#albums.setVisible(false); this.#items = []; this.#catalogLoadError = ''; this.#space = undefined; this.#members = []; this.#audit = []; this.#auditPreviewError = ''; this.#roomStatus = undefined; if(!preserve||!this.#editor?.source.generation)this.#editor = undefined; this.#close(); }
  #forgetRoomObservations(): void { this.#directoryToken++; this.#directoryBusy=false;this.#directoryError='';this.#observations.clear(); }
  #resetDirectory(): void { this.#forgetRoomObservations(); this.#items=[]; this.#cursor=null; this.#pages=1;this.#queryKey=''; }
  #syncDirectoryCheck(): void {
    this.#checkRooms.disabled = !this.#supported || !this.client.connected || !this.options.checkDirectoryRooms
      || this.#busy || !!this.#pending || this.#loading || this.#directoryBusy;
  }
  async #checkDirectoryRooms(): Promise<void> {
    if (!this.options.checkDirectoryRooms || !this.#visible || this.#destroyed || this.#selected || this.#directoryBusy || this.#busy || this.#pending || !this.options.current() || !this.client.connected || !this.#supported) return;
    const token=++this.#directoryToken;this.#directoryBusy=true;this.#directoryError='';this.#observations.clear();
    const valid=()=>token===this.#directoryToken&&this.#visible&&!this.#destroyed&&!this.#selected&&this.options.current()&&this.client.connected&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;
    try {
      await this.refresh(false,true); if(!valid()||this.#error||this.#catalogLoadError)return;
      const source=this.#source,key=this.#queryKey;
      const snapshot=this.#items.filter(s=>s.canRead&&!s.archived&&s.room).map(s=>({id:s.id,revision:s.revision,room:structuredClone(s.room!)}));
      if(!snapshot.length)return;
      const rooms=[...new Map(snapshot.map(s=>[spaceRoomKey(s.room),s.room])).values()];
      const observed=await this.options.checkDirectoryRooms(rooms),checkedAt=Date.now();
      if(!valid()||key!==this.#queryKey||!sameSpaceSource(source,this.#source))return;
      // Re-read current Cloud rights and links after the native request completes.
      await this.refresh(false,true);
      if(!valid()||this.#error||this.#catalogLoadError||key!==this.#queryKey||!sameSpaceSource(source,this.#source))return;
      for(const old of snapshot){const current=this.#items.find(s=>s.id===old.id);
        if(current?.canRead&&!current.archived&&current.room&&current.revision===old.revision&&spaceRoomIdentity(current.room)===spaceRoomIdentity(old.room)){
          this.#observations.set(old.id,{revision:old.revision,room:spaceRoomIdentity(old.room),checkedAt,result:observed.get(spaceRoomKey(old.room))??null});
        }
      }
    } catch {if(valid())this.#directoryError='Room status could not be checked. Try again.';}
    finally {if(valid()){this.#directoryBusy=false;this.#render();}}
  }
  #valid(token: number): boolean { return this.#visible && !this.#destroyed && this.options.current() && this.client.connected && this.client.memberNumber===this.#owner && this.client.origin===this.#origin && token === this.#token; }
  #button(label: string, action: () => void, icon?: KikiLinkIconName, pressed?: boolean, primary = false): HTMLButtonElement {
    const button = element('button', { type: 'button', className: `kl-text-button${primary ? ' kl-text-button--primary' : ''}`, disabled: this.#busy || !!this.#pending }, ...(icon ? [kikiIcon(icon)] : []), element('span', { text: label }));
    button.addEventListener('click',()=>{if(button.isConnected&&!button.disabled&&this.#visible&&!this.#destroyed&&this.options.current())action();});
    if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
    return button;
  }
  #infoButton(label: string, action: () => void, primary=false): HTMLButtonElement {
    const button=element('button',{type:'button',className:`kl-text-button${primary?' kl-text-button--primary':''}`},element('span',{text:label}));
    button.addEventListener('click',()=>{if(button.isConnected&&this.#infoDialog.contains(button)&&this.#infoDialog.open&&!button.disabled&&!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin)action();});return button;
  }
  #select(label: string, choices: Array<[string, string]>, value: string, change: (value: string) => void): HTMLSelectElement {
    const select = element('select', { ariaLabel: label });
    for (const [key, text] of choices) select.append(element('option', { value: key, text }));
    select.value = value; select.addEventListener('change', () => change(select.value)); return select;
  }
  #catalogQuery(): URLSearchParams {
    const query = new URLSearchParams({ scope: this.#scope, limit: '20', q: this.#search.value.trim() });
    if (this.#directory) query.set('directory', '1');
    if (this.#language.value.trim()) query.set('language', this.#language.value.trim());
    if (this.#communityId) query.set('communityId', this.#communityId);
    return query;
  }
  #isCatalogLoading(): boolean {
    return this.#results.firstElementChild?.classList.contains('kl-sp-catalog-loading') === true;
  }
  async refresh(append = false, background = false, sectionTrigger?: HTMLButtonElement): Promise<void> {
    if (!this.#visible || this.#busy) return;
    this.#closeMenus(true);this.#restorePending();
    const before = JSON.stringify([this.#items, this.#space, this.#members, this.#membersError, this.#detailCursor, this.#audit, this.#auditPreviewError, this.#upcoming, this.#eventsError, this.#spaceEvents, this.#spaceModerators, this.#error, this.#catalogLoadError, this.#supported, [...this.#observations]]);
    const token = ++this.#token; this.#loading = true; this.#backgroundRead = background; this.#error = ''; this.#catalogLoadError = ''; this.element.setAttribute('aria-busy', 'true');
    if (!this.#valid(token)) {
      this.#supported = false; this.#loading = false; this.#clearPrivate(true); this.#render(); return;
    }
    if (!background) {
      const catalogLoading = !append && !this.#selected && !this.#restoreList &&
        (!this.#items.length || this.#queryKey !== this.#catalogQuery().toString() || this.#isCatalogLoading());
      if (catalogLoading) {
        this.#results.replaceChildren(this.#loadingGrid('Loading rooms', 4, true));
        this.#paintCatalogControls();
      }
      if (catalogLoading && this.element.dataset.detail === 'true') this.#render();
      else this.#paintStatus();
    }
    try {
      const me = await this.client.request<{ features?: { persistentSpaces?: boolean; spaceDirectory?: boolean; roomOpening?: boolean; workshopRoomThemes?: boolean; spaceAppearance?: boolean; spaceEvents?: boolean; spaceReports?: boolean; spaceModerators?: boolean } }>('GET', '/v1/me');
      if (!this.#valid(token)) return; this.#supported = !!me.features?.persistentSpaces; this.#roomOpening = me.features?.roomOpening === true; this.#roomThemes = !!me.features?.workshopRoomThemes;this.#spaceEvents=!!me.features?.spaceEvents;this.#spaceReports=!!me.features?.spaceReports;this.#spaceModerators=me.features?.spaceModerators===true;this.#reportSource=this.#spaceReports?captureReportSource(this.client,me,()=>this.options.current()):undefined;
      const read=spaceRead(this.client,me);
      if(!sameSpaceSource(this.#source,read.source)||this.#directory!==!!me.features?.spaceDirectory){this.#resetDirectory();append=false;}
      this.#directory=!!me.features?.spaceDirectory;this.#source=read.source;this.#pending?.intent?.observe(read.source);
      if(this.#editor&&!sameSpaceSource(this.#editor.source,read.source)){this.#editor.held=true;this.#editor.error='This Space changed. Your original draft is kept for review.';this.#paintEditor();}
      if (!this.#supported) { this.#clearPrivate(true); return; }
      this.#communityCanHost = false;
      if (this.#communityId) {
        const community = await communityManagementRead(this.client, me).request<{
          name: string; membership: string; role: string | null; canManage: boolean; archived: boolean; restricted?: boolean;
        }>('GET', `/v1/communities/${this.#communityId}`);
        if (!this.#valid(token)) return;
        this.#communityName = community.name;
        this.#communityCanHost = community.membership === 'active' && (community.role === 'owner' || community.role === 'admin') &&
          community.canManage && !community.archived && !community.restricted;
      }
      const hosts = await read.request<{ items: Host[] }>(`${BASE}/hosts`);
      if (!this.#valid(token)) return; this.#hosts = hosts.items;
      if (!this.#editor?.source.generation && this.#editor?.draft.communityId && !this.#editor.space && !this.#hosts.some(h => h.id === this.#editor!.draft.communityId)) { this.#editor = undefined; this.#close(); }
      if (this.#selected) {
        const space = await read.request<PersistentSpace>(`${BASE}/${this.#selected}`);space.recoverySource=read.source;
        if (!this.#valid(token)) return;
        const priorRoom = this.#space?.room, nextRoom = space.room;
        if (this.#space?.revision !== space.revision || !sameSpaceSource(this.#space?.recoverySource ?? { required: false }, read.source) ||
            (priorRoom && spaceRoomIdentity(priorRoom)) !== (nextRoom && spaceRoomIdentity(nextRoom))) {
          this.#roomToken++; this.#roomBusy = false; this.#roomStatus = undefined;
        }
        this.#space = space;
        this.#upcoming=[];this.#eventsError='';
        if (!space.canManage && this.#memberState !== 'active') {
          this.#tab = 'overview'; this.#memberState = 'active'; this.#members = [];
        }
        if (!this.#canOpenSection(space, this.#tab)) this.#tab = 'overview';
        if(space.canRead&&!space.archived&&this.#spaceEvents&&this.#tab==='overview'){
          const query=new URLSearchParams({spaceId:space.id,status:'scheduled',limit:'3'});
          try{const page=await read.request<Page<SpaceEvent>>(`/v1/calendar/events?${query}`);if(!this.#valid(token))return;this.#upcoming=page.items;}
          catch(error){if(!this.#valid(token))return;if(error instanceof SpaceRecoveryError||error instanceof CloudError&&[401,403,404,409].includes(error.status))throw error;this.#eventsError='Events could not load. Try again.';}
        }
        if (!space.canManage) { this.#audit = []; this.#auditPreviewError = ''; }
        if(this.#editor?.space&&!space.canManage){if(this.#editor.source.generation){this.#editor.held=true;this.#editor.error='You can no longer manage this Space. Your original draft is kept.';this.#paintEditor();}else{this.#editor=undefined;this.#close();}}
        if (!space.canRead) { this.#members = []; this.#audit = []; this.#roomStatus = undefined; }
        if (space.canRead && this.#tab === 'members') {
          this.#membersError = '';
          try {
            const items = append ? [...this.#members] : [];
            const seen = new Set(items.map(member=>member.memberNumber));
            let cursor = append ? this.#detailCursor ?? 0 : 0, next: number | null = null;
            // The API pages by member number only. Resolve additional pages before claiming a filtered result.
            const pages = this.#memberQuery.trim() || this.#memberRole ? 25 : 1;
            for (let i = 0; i < pages; i++) {
              const page = await read.request<Page<Member>>(`${BASE}/${space.id}/members?state=${this.#memberState}&limit=40&cursor=${cursor}`);
              if (!this.#valid(token)) return;
              for(const member of page.items)if(!seen.has(member.memberNumber)){seen.add(member.memberNumber);items.push(member);}
              next = page.nextCursor;
              if (next !== null && (!Number.isSafeInteger(next) || next <= cursor)) throw new Error('Invalid member cursor');
              if (next === null) break;
              cursor = next;
            }
            this.#members = items; this.#detailCursor = next;
          } catch (error) {
            if (!this.#valid(token)) return;
            if (error instanceof SpaceRecoveryError || error instanceof CloudError && [401,403,404,409].includes(error.status)) throw error;
            if(!append){this.#members = []; this.#detailCursor = null;} this.#membersError = 'Members could not load. Try again.';
          }
        } else if (space.canManage && (this.#tab === 'audit' || this.#tab === 'overview')) {
          const preview = this.#tab === 'overview'; this.#auditPreviewError = '';
          try {
            const page = await read.request<Page<Audit>>(`${BASE}/${space.id}/audit?limit=${preview ? 4 : 40}&cursor=${!preview && append ? this.#detailCursor ?? 0 : 0}`);
            if (!this.#valid(token)) return;
            this.#audit = !preview && append ? [...this.#audit, ...page.items] : page.items;
            if (!preview) this.#detailCursor = page.nextCursor;
          } catch (error) {
            if (!this.#valid(token)) return;
            if (error instanceof SpaceRecoveryError || error instanceof CloudError && [401,403,404,409].includes(error.status)) throw error;
            if(preview||!append)this.#audit = []; if (!preview&&!append) this.#detailCursor = null;
            this.#auditPreviewError = preview ? 'Activity could not load. Open Activity to try again.' : 'Activity could not load. Try again.';
          }
        }
      } else {
        const query = this.#catalogQuery();
        const key=query.toString();if(key!==this.#queryKey){this.#pages=1;append=false;this.#queryKey=key;}
        const items:PersistentSpace[]=append?[...this.#items]:[];let cursor=append?this.#cursor:null,pageCount=0,next:number|string|null=null;
        for(let i=0;i<(append?1:this.#pages);i++){if(cursor)query.set('cursor',String(cursor));else query.delete('cursor');
          const page=await read.request<Page<PersistentSpace,number|string>>(`${BASE}?${query}`);if(!this.#valid(token))return;
          for(const space of page.items)space.recoverySource=read.source;
          items.push(...page.items.filter(s=>!items.some(old=>old.id===s.id)));pageCount++;next=page.nextCursor;if(!next)break;cursor=next;
        }
        this.#items=items;this.#cursor=next;this.#pages=append?this.#pages+pageCount:pageCount||1;
        for(const [id,observation] of this.#observations){const space=items.find(s=>s.id===id);if(!space||observedSpaceRoom(space,observation)===undefined)this.#observations.delete(id);}
      }
    } catch (error) {
      if (this.#valid(token)) {
        if (this.#selected) this.#error = failure(error);
        else {
          const hasReadMessage = error instanceof SpaceRecoveryError || error instanceof CloudError &&
            (error.code === 'invalid_space_directory_cursor' || error.status === 401 || error.status === 429);
          this.#catalogLoadError = hasReadMessage ? failure(error) : 'Your saved Spaces are unchanged.';
          this.#pages = 1;
        }
        this.#observations.clear();this.#cursor=null; this.#items = []; this.#space = undefined; this.#members = []; this.#audit = []; this.#roomStatus = undefined; this.#roomToken++; this.#roomBusy = false;
        if (error instanceof SpaceRecoveryError || error instanceof CloudError && [401,403,404,409].includes(error.status)) {this.#hideReport(false);if(this.#editor?.source.generation){this.#editor.held=true;this.#editor.error='The Space is unavailable. Your original draft is kept.';this.#paintEditor();}else{this.#editor=undefined;this.#close();}}
      }
    } finally {
      if (this.#valid(token)) {
        this.#loading = false; this.element.setAttribute('aria-busy', 'false');
        const after = JSON.stringify([this.#items, this.#space, this.#members, this.#membersError, this.#detailCursor, this.#audit, this.#auditPreviewError, this.#upcoming, this.#eventsError, this.#spaceEvents, this.#spaceModerators, this.#error, this.#catalogLoadError, this.#supported, [...this.#observations]]);
        if (!background || before !== after || this.#isCatalogLoading()) this.#render(sectionTrigger); else this.#paintStatus();
        if (this.#resumeScroll !== undefined) { this.element.scrollTop = this.#resumeScroll; this.#resumeScroll = undefined; }
      }
    }
  }
  #paintStatus(): void {
    this.#syncDirectoryCheck();
    this.#status.replaceChildren(); this.#status.dataset.error = String(!!this.#error);
    if(!this.options.current()||!this.client.connected){this.#status.textContent='';return;}
    const pending=this.#pending;
    if(pending?.intent){
      const intent=pending.intent;
      this.#status.append(element('strong',{text:'Unfinished Space change'}),element('p',{text:this.#busy?'Saving…':intent.notice||this.#error||'The original action is kept until its result is confirmed.'}));
      this.#status.append(element('p',{text:`${intent.label}${intent.action==='member'?` · Member: #${pending.path.split('/').at(-1)}`:''}`}));
      const original=element('textarea',{ariaLabel:'Original Space change'});original.readOnly=true;original.rows=5;original.value=spaceChangeText(pending.body);this.#status.append(original);
      const control=(label:string,run:()=>void)=>{const b=element('button',{type:'button',className:'kl-text-button',text:label,disabled:this.#busy||intent.busy});b.addEventListener('click',()=>{if(b.isConnected&&!b.disabled&&this.#visible&&this.options.current()&&this.#pending===pending)run();});return b;};
      if(!intent.held)this.#status.append(control(intent.confirmed?'Refresh confirmed Space change':'Retry original Space change',()=>void this.#submit()));
      this.#status.append(control('Discard Space change',()=>{pending.discard=true;this.#paintStatus();}));
      if(pending.discard)this.#status.append(element('p',{text:'Discard these original details? This does not undo a change that may already have reached the server.'}),control('Keep Space change',()=>{pending.discard=false;this.#paintStatus();}),control('Confirm discard',()=>{intent.release();this.#pending=undefined;this.#editor=undefined;this.#close();void this.refresh();}));
    }else if(pending&&!this.#busy){
      const retry=this.#button('Retry request',()=>void this.#submit());retry.disabled=false;
      this.#status.append(element('span',{text:this.#error||'The result is not confirmed.'}),retry);
    }else this.#status.textContent=this.#busy?'Saving…':this.#error||this.#directoryError||(this.#directoryBusy?'Checking rooms…':this.#loading&&!this.#backgroundRead&&!this.#isCatalogLoading()?'Refreshing…':'');
    if(this.#noteDraft&&this.#noteDraft.value!==this.#noteDraft.baseline&&!this.#infoDialog.open){this.#status.append(this.#button('Review private note draft',()=>this.#paintNote()));}
    if(this.#reportDialog&&(this.#reportState.dirty||this.#reportState.pending)&&!this.#reportDialog.open){this.#status.append(this.#button('Review report draft',()=>{this.#reviewReport();}));}
    if(this.#editor?.source.generation&&!pending&&!this.#dialog.open){const b=this.#button('Review saved Space draft',()=>{this.#paintEditor();this.#showDialog();});this.#status.append(b);}
  }

  #paintCatalogControls(summary = ''): HTMLButtonElement | undefined {
    this.#filters.set({scope:this.#scope,language:this.#language.value,status:this.#roomFilter}, summary);
    const disabled = this.#busy || !!this.#pending;
    this.#filters.button.disabled = this.#search.disabled = this.#sortControl.disabled = disabled;
    this.#sortControl.value = this.#sort;
    for (const button of this.#tabs.querySelectorAll('button')) {
      button.disabled = disabled;
      if (button.dataset.scope) button.setAttribute('aria-pressed', String(button.dataset.scope === this.#scope));
    }
    this.#activeFilters.replaceChildren();
    const showActiveFilters = this.options.directory
      ? this.#scope !== 'all' || Boolean(this.#language.value || this.#roomFilter)
      : this.#filtered();
    if (!this.#filtered()) return;
    const reset = this.#button('Clear filters', () => {
      this.#resetFilters();
      this.#search.focus({ preventScroll: true });
    });
    if (showActiveFilters) {
      const status = this.#roomFilter === 'open' ? 'Open' : this.#roomFilter === 'full' ? 'Full' : this.#roomFilter === 'closed' ? 'Closed' : '';
      const tags = [];
      for (const [key, value] of [['language', this.#language.value], ['status', status]] as const) {
        if (value) tags.push(removableFilter(this.#button(value, () => this.#filters.remove(key)), value));
      }
      this.#activeFilters.append(...tags, reset);
    }
    return reset;
  }
  #render(sectionTrigger?: HTMLButtonElement): void {
    this.#notifyRoomRoute();
    this.#cancelEventsReveal();
    this.#closeMenus(true);
    if(!this.#space?.canRead||this.#space.archived||!this.#spaceEvents||this.#tab!=='events'){this.#eventsPanel?.setVisible(false);this.#eventsPanelSpace=undefined;}
    const genericContext=this.#contextSpaceId===null&&this.#infoDialog.open,infoCurrent=this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;
    if(!infoCurrent||!genericContext&&(!this.#space||!this.#space.canRead||!this.client.connected))this.#closeInfo(infoCurrent);
    if (this.#presetReview && (!infoCurrent || !this.client.connected || !this.#space)) this.#close();
    if (this.#roomSetup && !this.#loading && !this.#roomSetup.current()) this.#roomSetup.cancel();
    if ((this.#roomEntry || this.#roomCheck) && (!infoCurrent || !this.client.connected || !this.#space)) this.#close();
    if(!this.#space||this.#space.archived||!this.#spaceReports||!this.client.connected||!this.options.current())this.#hideReport(false);
    this.element.setAttribute('aria-busy', String(this.#loading || this.#busy || this.#directoryBusy)); this.element.dataset.detail = String(!!this.#selected); this.#paintStatus();
    const create = this.#button('Create space', () => this.#edit(), 'plus', undefined, true); create.disabled ||= !this.#supported || !this.client.connected;
    this.#heading.replaceChildren(...(this.options.directory ? [] : [element('h1',{text:'Spaces'})]),element('div',{className:'kl-sp-actions'},iconButton('Refresh','refresh',()=>void this.refresh()),...(this.options.directory ? [] : [create])));
    const visible=visibleSpaces(this.#items,this.#observations,this.#sort,this.#roomFilter);
    this.#context.replaceChildren();if(this.#communityId)this.#context.append(this.#button(this.#communityName||'Community',()=>this.options.openCommunity(this.#communityId!),'users'),iconButton('Clear community filter','close',()=>{if(this.#busy||this.#pending)return;this.#communityId=undefined;this.#communityName='';void this.refresh();}));
    this.#heading.hidden = !!this.options.directory;
    this.#toolbar.hidden = this.#scopeRow.hidden = this.#activeFilters.hidden = !!this.#selected;
    const catalogLoading = !this.#selected && this.#loading && this.#isCatalogLoading();
    const reset = this.#selected ? undefined : this.#paintCatalogControls(this.#catalogLoadError || catalogLoading ? '' :
      `${visible.length} ${visible.length===1?'Space':'Spaces'} shown${this.#cursor?' · more available':''}`);
    if (!this.client.connected || !this.options.current()) { this.#results.replaceChildren(this.#empty('Connect to Cloud', 'Your spaces will appear here.')); return; }
    if (catalogLoading) return;
    if (!this.#supported && !this.#catalogLoadError) { this.#results.replaceChildren(this.#loading ? this.#loadingGrid('Loading spaces') : this.#empty('Spaces are not available yet', 'Update the test server to enable Spaces.')); return; }
    if (this.#selected) {
      const active = this.#activeElement();
      const previousTabs = this.#results.querySelector<HTMLElement>(detailTablist);
      const focusedTab = active?.matches('button[role="tab"]') && active.parentElement === previousTabs;
      const focusedMember = this.#focusedMemberOption();
      if(this.#space){
        const input = this.#results.querySelector<HTMLInputElement>('[aria-label="Search Space members"]');
        const selection=input&&active===input?[input.selectionStart,input.selectionEnd]:undefined;
        const revealSection = sectionTrigger && active === sectionTrigger && this.#space.canRead;
        const restoreQuickEdit = this.#results.contains(active) &&
          (active?.matches(quickEditTriggers.announcement.selector) ? 'announcement' :
            active?.matches(quickEditTriggers.preset.selector) ? 'preset' : undefined);
        const roomTrigger = this.#results.contains(active) &&
          [roomSettingsTrigger, roomSetupTrigger, roomEntryTrigger, roomCheckTrigger].find(selector => active?.matches(selector));
        const focusedPreset = this.#results.contains(active) && active?.getAttribute('data-room-preset-id');
        this.#results.replaceChildren(this.#detail(this.#space));
        const tabs = this.#results.querySelector<HTMLElement>(detailTablist);
        if (tabs && previousTabs) tabs.scrollLeft = previousTabs.scrollLeft;
        if(selection){const next=this.#results.querySelector<HTMLInputElement>('[aria-label="Search Space members"]');next?.focus({preventScroll:true});next?.setSelectionRange(selection[0]??0,selection[1]??0);}
        if (revealSection) this.#revealSection();
        else if (focusedTab) {
          if (tabs) this.#revealSection(false);
          else this.#results.querySelector<HTMLButtonElement>('.kl-sp-path > button')?.focus({ preventScroll: true });
        }
        if (restoreQuickEdit) this.#focusQuickEdit(this.#space.id, restoreQuickEdit);
        if (roomTrigger) this.#focusEditTrigger(this.#space.id, 'room', roomTrigger);
        if (focusedPreset) this.#focusPreset(this.#space.id, focusedPreset);
        if (this.#presetReview && !this.#loading && !this.#busy && !this.#currentPresetReview(this.#presetReview)) {
          this.#closePresetReview(this.#presetReview);
        }
        if (this.#roomEntry && !this.#loading && !this.#roomEntry.current()) this.#roomEntry.cancel();
        if (this.#roomCheck && !this.#loading && !this.#roomCheck.current()) this.#roomCheck.cancel();
        if (focusedMember) this.#restoreMemberOptionFocus(focusedMember);
        return;
      }
      const state=element('div',{},this.#button('All spaces',()=>this.#backToList(),'back'));
      if(this.#loading)state.append(this.#loadingGrid('Loading space',1));
      else{const empty=this.#empty(this.#error?'Space couldn’t load':'Space unavailable',this.#error||'It may have been removed or your access may have changed.',this.#error?'warning':'location');empty.append(this.#button('Retry',()=>void this.refresh(),'refresh',undefined,true));state.append(empty);}this.#results.replaceChildren(state);
      if (focusedTab || focusedMember) state.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      return;
    }
    if(this.#loading&&!this.#items.length){this.#results.replaceChildren(this.#loadingGrid('Loading spaces'));return;}
    if (this.#catalogLoadError) {
      const error = this.#empty('Rooms couldn’t load', this.#catalogLoadError, 'door');
      error.classList.add('kl-explore-empty', 'kl-sp-catalog-error');
      error.setAttribute('role', 'alert');
      const retry = this.#button('Retry', () => {
        if (this.#loading) return;
        clearTimeout(this.#searchTimer);
        if (this.#activeElement() === retry) this.#search.focus({preventScroll:true});
        void this.refresh();
      }, undefined, undefined, true);
      error.append(retry);
      this.#results.replaceChildren(error);
      return;
    }
    const filtered = this.#filtered();
    const roomFilterHelp = this.options.directory ? 'Check room status in Your Space context, load more spaces or clear the filters.' : 'Check room status, load more spaces or clear the filters.';
    const empty=this.#empty(this.#roomFilter?'No matching rooms in loaded spaces':filtered?'No matching rooms':'No spaces here yet',this.#roomFilter?roomFilterHelp:filtered?'Try a different name, language or room status.':'Create a place for your people, or try another filter.',this.#search.value.trim()?'search':'door');
    if(!visible.length && reset){
      empty.classList.add('kl-explore-empty');
      reset.classList.add('kl-text-button--primary');
      empty.append(reset);
    }
    else empty.append(this.#button('Create space',()=>this.#edit(),'plus',undefined,true));
    const directoryNote = [this.#cursor && 'Sort and room filters apply to loaded spaces.', !this.options.directory && roomStatusNote].filter(Boolean).join(' ');
    this.#results.replaceChildren(element('div',{className:'kl-browse-summary kl-sp-directory-summary'},
      element('span',{role:'status',text:`${visible.length} ${visible.length===1?'Space':'Spaces'}${this.#roomFilter?` match · ${this.#items.length} loaded`:this.#cursor?' loaded':''}${this.#cursor?' · More available':''}`}),
      ...(directoryNote ? [element('span', { className: 'kl-sp-directory-note', text: directoryNote })] : [])),
      ...(visible.length?[element('div', { className: 'kl-sp-grid' }, ...visible.map(s => this.#card(s)))]:[empty]));
    if (this.#cursor) {
      const more = pageAction(this.#button('Load more spaces', () => {
        void focusPageResults(this.#results, () => {
          more.disabled = true;
          return this.refresh(true);
        });
      }));
      more.disabled ||= this.#loading || this.#directoryBusy;
      this.#results.append(more);
    }
    if(this.#restoreList&&!this.#loading){this.#restoreList=false;this.element.scrollTop=this.#listScroll;if(this.#returnId)this.#results.querySelector<HTMLButtonElement>(`[data-space-id="${this.#returnId}"] .kl-sp-title`)?.focus({preventScroll:true});}
  }
  #filtered(): boolean {
    return Boolean(this.#search.value || this.#language.value || this.#roomFilter || this.#scope !== 'all' || this.#sort !== 'recommended');
  }
  #resetFilters(): void {
    clearTimeout(this.#searchTimer);
    this.#search.value = ''; this.#language.value = ''; this.#roomFilter = '';
    this.#scope = 'all'; this.#sort = 'recommended'; this.#resetDirectory(); void this.refresh();
  }
  #empty(title: string, copy: string, icon: KikiLinkIconName='location'): HTMLElement { return element('div', { className: 'kl-sp-empty' }, kikiIcon(icon), element('h2', { text: title }), element('p', { text: copy })); }
  #loadingGrid(label: string, count = 4, catalog = false): HTMLElement {
    const grid = element('div', { className: `kl-sp-grid kl-sp-loading${catalog ? ' kl-sp-catalog-loading' : ''}`, role: 'status', ariaLabel: label });
    grid.setAttribute('aria-busy', 'true');
    for (let index = 0; index < count; index++) {
      grid.append(element('div', { className: 'kl-sp-skeleton-card', ariaHidden: 'true' },
        element('div', { className: 'kl-sp-skeleton' }),
        catalog ? undefined : element('div', { className: 'kl-sp-skeleton kl-sp-skeleton--medium' }),
        element('div', { className: 'kl-sp-skeleton' }),
        element('div', { className: 'kl-sp-skeleton kl-sp-skeleton--short' })));
    }
    return grid;
  }
  #badge(text: string): HTMLElement { return element('span', { className: 'kl-sp-badge', text }); }
  #spaceIcon(space: PersistentSpace): HTMLElement {
    const appearance=spaceAppearance(space),node=element('span',{className:'kl-sp-card-heading-icon',ariaHidden:'true'},kikiIcon(appearance.icon==='sparkles'?'activities':appearance.icon));
    node.dataset.color=appearance.color;return node;
  }
  #activeSpace(space: PersistentSpace): PersistentSpace | undefined {
    return this.#visible&&!this.#destroyed&&this.options.current()&&this.client.connected&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&this.#selected===space.id&&this.#space?.id===space.id?this.#space:undefined;
  }
  #listedSpace(id: string): PersistentSpace | undefined {
    return this.#valid(this.#token) && !this.#selected && !this.#loading ? this.#items.find(space => space.id === id) : undefined;
  }
  #spaceMenu(space: PersistentSpace, anchor: HTMLElement, catalog = false): void {
    const getSpace = () => {
      if (this.#loading) return;
      return catalog ? this.#listedSpace(space.id) : this.#activeSpace(space);
    };
    const current = getSpace();
    if (!current || !anchor.isConnected) return;
    const run = (action: (s: PersistentSpace) => void) => () => { const latest = getSpace(); if (latest && anchor.isConnected) action(latest); };
    const locked = this.#busy || !!this.#pending;
    const actions: ShellAction[] = [
      { label: current.saved ? 'Remove saved Space' : 'Save Space', icon: 'bookmark', disabled: locked, run: run(s => this.#save(s)) },
      { label: 'Share Space', icon: 'copy', run: run(s => this.#share(s, catalog)) },
    ];
    if (current.canManage) actions.push({ label: 'Manage Space', icon: 'settings', disabled: locked, run: run(s => {
      if (!s.canManage) return;
      if (catalog) void this.#editListedSpace(s);
      else this.#edit(s);
    }) });
    if (this.#spaceReports && !current.archived) actions.push({ label: 'Report Space', icon: 'flag', run: run(s => this.#report(s, catalog)) });
    if (!catalog && current.canManage) actions.push({ label: 'Archive Space', icon: 'archive', disabled: locked,
      run: run(s => { if (s.canManage) this.#confirm('Archive this space?','Members keep its details. Discovery, invitations and changes pause until you restore it.','Archive space',()=>this.#action(s,'archive',{archived:true})); }) });
    if (!catalog && current.membership === 'invited' && this.#canEndMembership(current)) {
      actions.push({ label: 'Decline invitation', icon: 'close', disabled: locked,
        run: run(s => { if (s.membership === 'invited') this.#confirmMembershipEnd(s, anchor); }) });
    }
    this.#exploreMenu.element.classList.remove('kl-explore-membership-menu');
    this.#exploreMenu.element.classList.toggle('kl-explore-detail-options', !catalog);
    this.#exploreMenu.open(anchor,'Space options',actions,undefined,false,false);
  }
  async #editListedSpace(space: PersistentSpace): Promise<void> {
    if (this.#busy || this.#pending || this.#resumePersonalDraft()) return;
    const token = ++this.#token, source = space.recoverySource ?? this.#source;
    const current = () => this.#valid(token) && !this.#busy && !this.#pending &&
      this.#listedSpace(space.id)?.canManage && sameSpaceSource(source, this.#source);
    try {
      const detail = await spaceReadAt(this.client, source)<PersistentSpace>(`${BASE}/${space.id}`);
      if (!current()) return;
      if (detail.id !== space.id || !detail.canManage) throw new CloudError('space_unavailable', 404);
      this.#edit({ ...detail, recoverySource: source });
    } catch (error) {
      if (current()) { this.#error = failure(error); this.#paintStatus(); }
    }
  }
  #canEndMembership(space: PersistentSpace): boolean {
    return !space.archived && space.owner !== this.#owner && space.role !== 'owner' &&
      ['active', 'requested', 'invited'].includes(space.membership);
  }
  #membershipControl(space: PersistentSpace): HTMLElement | undefined {
    const requested = space.membership === 'requested';
    if (!requested && space.membership !== 'active') return;
    if (space.archived) return this.#badge(requested ? 'Request pending' : space.spaceArchived ? 'Joined · Archived Space' : 'Joined · Archived community');
    const trigger = this.#button(requested ? 'Requested' : 'Joined', () => this.#membershipMenu(space, trigger), requested ? 'clock' : 'check');
    trigger.classList.add('kl-sp-membership-trigger', requested ? 'kl-sp-requested' : 'kl-sp-joined');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    return trigger;
  }
  #membershipMenu(space: PersistentSpace, anchor: HTMLElement): void {
    const current = this.#activeSpace(space);
    if (!current || current.membership !== space.membership || current.archived || this.#loading || !anchor.isConnected) return;
    const actions: ShellAction[] = [];
    if (this.#canEndMembership(current)) {
      actions.push({ label: current.membership === 'requested' ? 'Cancel request' : 'Leave Space', icon: 'close',
        run: () => this.#confirmMembershipEnd(current, anchor) });
    } else if (current.membership === 'active' && current.canRead) {
      actions.push({ label: 'View members', icon: 'users', run: () => {
        if (this.#activeSpace(current)?.canRead) this.#openSection('members');
      } });
    }
    if (actions.length) {
      this.#exploreMenu.element.classList.remove('kl-explore-detail-options');
      this.#exploreMenu.element.classList.add('kl-explore-membership-menu');
      this.#exploreMenu.open(anchor, 'Space membership', actions, undefined, false, false);
    }
  }
  #confirmMembershipEnd(space: PersistentSpace, anchor: HTMLElement): void {
    const current = (): PersistentSpace | undefined => {
      const latest = this.#activeSpace(space);
      if (this.#busy || this.#pending || this.#loading || !latest || !this.#canEndMembership(latest) ||
        latest.membership !== space.membership || latest.revision !== space.revision ||
        !sameSpaceSource(latest.recoverySource ?? { required: false }, space.recoverySource ?? { required: false })) return;
      return latest;
    };
    if (!current()) return;
    const leaving = space.membership === 'active', requested = space.membership === 'requested';
    const title = leaving ? 'Leave this Space?' : requested ? 'Cancel your request?' : 'Decline this invitation?';
    const cancel = () => { this.#close(); if (this.#visible && anchor.isConnected) anchor.focus({ preventScroll: true }); };
    const stay = this.#button(leaving ? 'Stay' : requested ? 'Keep request' : 'Keep invitation', cancel);
    const submit = this.#button(leaving ? 'Leave Space' : requested ? 'Cancel request' : 'Decline invitation', () => {
      const latest = current();
      if (latest) this.#action(latest, 'leave');
      else cancel();
    });
    submit.classList.add('kl-sp-membership-danger');
    const copy = element('p', {}, leaving ? 'You’ll leave ' : requested ? 'You’ll withdraw your request to join ' : 'You’ll decline your invitation to ',
      element('strong', { text: space.name }), leaving
        ? space.access === 'public' ? '. You can join again anytime.' : '. You’ll need access again to read its shared content.' : '.');
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(
      element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
        iconButton('Close dialog', 'close', cancel)),
      element('div', { className: 'kl-room-dialog-body kl-sp-membership-confirm-body' }, copy,
        leaving ? element('p', { className: 'kl-sp-field-note', text: 'This action changes your Space membership.' }) : undefined),
      element('footer', { className: 'kl-sp-actions kl-sp-membership-confirm-footer' }, stay, submit));
    this.#showDialog();
    stay.focus({ preventScroll: true });
  }
  #resumePersonalDraft(): boolean {
    if(this.#noteDraft&&this.#noteDraft.value!==this.#noteDraft.baseline){this.setVisible(true);this.#paintNote();return true;}
    return this.#reviewReport();
  }
  #reviewReport(): boolean {
    const dialog=this.#reportDialog;
    if(!dialog?.isConnected||!(this.#reportState.dirty||this.#reportState.pending)||this.#destroyed||!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return false;
    this.setVisible(true);
    if(this.#reportDialog!==dialog||!dialog.isConnected)return false;
    if(!dialog.open){dialog.showModal();fitPanelDialog(dialog);}return true;
  }
  #hideReport(discard=false): void {
    if(this.#reportDialog?.open)this.#reportDialog.close();
    if(discard){this.#reportDialog?.remove();this.#reportDialog=undefined;this.#reportState={busy:false,pending:false,dirty:false};}
  }
  #report(space: PersistentSpace, catalog = false): void {
    const available = () => catalog ? this.#listedSpace(space.id) : this.#activeSpace(space);
    const current=available();if(!current||current.archived||!this.#spaceReports||!this.#reportSource||!sameSpaceSource(space.recoverySource??{required:false},this.#source)||!sameSpaceSource(current.recoverySource??{required:false},this.#source))return;
    if(this.#resumePersonalDraft())return;
    this.#hideReport(true);
    const source=this.#reportSource,dialog=targetReportDialog(this.client,{
      type:'space',id:space.id,title:'Report Space',label:'Space',summary:space.name,context:accessLabel(space.access),
      notice:'Platform moderators receive your reason and an encrypted snapshot of the displayed Space details. Room settings, members and private notes are not included.',
      structured:true,source,sourceKey:String(space.revision),panel:this.element.closest<HTMLElement>('.kl-panel')??undefined,
      current:()=>this.#visible&&!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&
        (!catalog||this.#spaceReports&&available()?.archived===false&&sameSpaceSource(space.recoverySource??{required:false},this.#source)),
      close:()=>this.#hideReport(true),submitted:()=>{},state:state=>{this.#reportState=state;},
    });
    dialog.classList.add('kl-sp-report-dialog');
    this.#reportDialog=dialog;this.element.append(dialog);dialog.showModal();fitPanelDialog(dialog);
  }
  #requestInfoClose(): void {
    const draft=this.#noteDraft;if(draft&&draft.value!==draft.baseline){draft.discard=true;if(this.#infoDialog.querySelector('.kl-sp-note-editor'))this.#showNoteDiscard(draft);else this.#paintNote();return;}this.#closeInfo();
  }
  #editNote(space: PersistentSpace): void {
    const current=this.#activeSpace(space);if(!current?.canRead||current.archived)return;
    if(this.#resumePersonalDraft())return;
    const baseline=this.#notes.get(space.id);
    this.#noteDraft={id:space.id,name:space.name,baseline,value:baseline,error:this.#notes.error,discard:false};this.#paintNote();
  }
  #paintNote(): void {
    const draft=this.#noteDraft;if(!draft)return;
    const textarea=element('textarea',{ariaLabel:`Note about ${draft.name}`,value:draft.value});textarea.maxLength=1000;textarea.rows=6;
    textarea.addEventListener('input',()=>{draft.value=textarea.value;draft.error='';error.textContent='';});
    const error=element('p',{className:'kl-sp-note-error',role:'status',text:draft.error});
    const body=element('div',{className:'kl-sp-info-body kl-sp-note-editor'},element('p',{text:'Only you can see this note.'}),element('label',{},element('span',{text:`Note about ${draft.name}`}),textarea),element('small',{text:'Up to 1,000 characters. Clear the field to remove the note.'}),error);
    const save=this.#infoButton('Save private note',()=>{
      const current=this.#space;if(!this.#visible||!current||current.id!==draft.id||!current.canRead||current.archived||!this.options.current()){draft.error='This Space is no longer available for editing. Your draft is still here.';this.#paintNote();return;}
      if(this.#notes.save(draft.id,draft.value,draft.baseline)){this.#closeInfo();this.#render();return;}
      draft.error=this.#notes.error||'Your note could not be saved. Your draft is still here.';
      const latest=this.#notes.get(draft.id);if(latest!==draft.baseline)draft.latest=latest;this.#paintNote();
    },true);
    this.#showInfo('Your private note',body,save);this.#noteDraft=draft;
    const cancel=this.#infoDialog.querySelector<HTMLButtonElement>('footer > button');if(cancel)cancel.textContent='Cancel';
    if(draft.error){body.append(this.#infoButton('Reload saved note',()=>{
      if(!this.#notes.reload()){draft.error=this.#notes.error;this.#paintNote();return;}
      draft.latest=this.#notes.get(draft.id);draft.error='Review the saved note before replacing it with your draft.';this.#paintNote();
    }));}
    if(draft.latest!==undefined){body.append(element('p',{text:'Currently saved note'}),element('p',{className:'kl-sp-note-latest',text:draft.latest||'No saved note.'}),this.#infoButton('Use saved note',()=>{draft.baseline=draft.latest!;draft.value=draft.latest!;delete draft.latest;draft.error='';this.#paintNote();}),this.#infoButton('Keep my draft',()=>{draft.baseline=draft.latest!;delete draft.latest;draft.error='';this.#paintNote();}));}
    if(draft.discard)this.#showNoteDiscard(draft);
    if(!draft.discard)textarea.focus();
  }
  #showNoteDiscard(draft: NoteDraft): void {
    const existing=this.#infoDialog.querySelector<HTMLElement>('.kl-sp-note-discard-area');
    if(existing){existing.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});return;}
    const area=element('div',{className:'kl-sp-note-discard-area'}),keep=this.#infoButton('Keep editing',()=>{
      if(this.#noteDraft!==draft||!area.isConnected)return;draft.discard=false;area.remove();
      this.#infoDialog.querySelector<HTMLTextAreaElement>('.kl-sp-note-editor textarea')?.focus();
    },true);
    area.append(element('section',{className:'kl-sp-note-discard',role:'alert'},element('strong',{text:'Discard these changes?'}),element('p',{text:'Your unsaved private note will be lost.'}),element('div',{className:'kl-sp-note-discard-actions'},keep,this.#infoButton('Discard changes',()=>{if(this.#noteDraft===draft&&area.isConnected)this.#closeInfo();}))));
    this.#infoDialog.append(area);keep.focus({preventScroll:true});
  }
  #allEvents(space: PersistentSpace, trigger: HTMLButtonElement): void {
    const current = this.#activeSpace(space);
    if (!current?.canRead) return;
    this.#closeInfo();
    if (this.#canOpenSection(current, 'events')) this.#openSection('events', trigger);
    else this.options.openEvents(current.communityId ?? undefined);
  }
  #upcomingBody(space: PersistentSpace): HTMLElement[] {
    if(space.archived)return [element('p',{className:'kl-sp-small-empty',text:'This Space is archived. Linked plans are paused.'})];
    if(!this.#spaceEvents)return [element('p',{className:'kl-sp-small-empty',text:'Linked events are not available on this Cloud yet.'})];
    if(this.#eventsError)return [element('p',{className:'kl-sp-small-empty',role:'status',text:this.#eventsError}),this.#button('Retry events',()=>void this.refresh())];
    if(!this.#upcoming.length)return [element('p',{className:'kl-sp-small-empty',text:'No upcoming events are linked to this Space yet.'})];
    return this.#upcoming.map(event=>{
      const row=this.#button(event.title,()=>{if(this.#activeSpace(space)?.canRead)this.options.openEvent?.(event.id);});
      row.classList.add('kl-sp-event-row');row.replaceChildren(element('span',{className:'kl-sp-event-icon',ariaHidden:'true'},kikiIcon('calendar')),element('span',{className:'kl-sp-row-copy'},element('strong',{text:event.title}),bindClockText(element('small'),event.startsAt,'medium-date-time')),kikiIcon('arrow-right'));return row;
    });
  }
  #closeInfo(preserveDraft=false): void {if(!preserveDraft)this.#noteDraft=undefined;this.#contextSpaceId=undefined;++this.#infoToken;if(this.#infoDialog.open)this.#infoDialog.close();this.#infoDialog.replaceChildren();if(this.#infoDialog.parentElement!==this.element)this.element.append(this.#infoDialog);}
  #showInfo(title: string, content: HTMLElement, extra?: HTMLElement): void {
    if(this.#noteDraft&&this.#noteDraft.value!==this.#noteDraft.baseline&&!content.classList.contains('kl-sp-note-editor')){this.#paintNote();return;}
    this.#closeMenus();this.#closeInfo();this.#infoDialog.setAttribute('aria-label',title);
    const context = content.classList.contains('kl-sp-context');
    const sharing = content.classList.contains('kl-explore-share-body');
    this.#infoDialog.classList.toggle('kl-sp-context-drawer', context);
    this.#infoDialog.classList.toggle('kl-explore-share-dialog', sharing);
    const heading = element('header', { className: sharing ? 'kl-sp-info-heading kl-explore-share-heading' : 'kl-sp-info-heading' },
      element('div', {}, element('span', { className: sharing ? 'kl-explore-share-eyebrow' : 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
      iconButton('Close dialog', 'close', () => { if (content.isConnected && this.#infoDialog.contains(content)) this.#requestInfoClose(); }));
    this.#infoDialog.replaceChildren(heading, content);
    if (!context) this.#infoDialog.append(element('footer', { className: sharing ? 'kl-sp-info-footer kl-explore-share-footer' : 'kl-sp-info-footer' },
      this.#infoButton('Close', () => this.#requestInfoClose()), extra));
    if(this.element.hidden)this.element.closest('.kl-panel')?.append(this.#infoDialog);
    if(this.#infoDialog.isConnected){this.#infoDialog.showModal();fitPanelDialog(this.#infoDialog,context?{layout:()=>({marginX:0,marginY:0})}:undefined);}
  }
  #share(space: PersistentSpace, catalog = false): void {
    const available = () => catalog ? this.#listedSpace(space.id) : this.#activeSpace(space);
    if(!available())return;let url:string;
    try{url=spaceShareUrl(location.href,space.id,this.client.origin);}catch{this.#error='The Space link could not be created.';this.#paintStatus();return;}
    const fields = shareLinkFields('Space link', url,
      'This link opens the Space in KikiLink on the same Cloud. Access is checked when it is opened.',
      () => this.#infoDialog.open && !!available());
    fields.body.classList.add('kl-sp-info-body');
    this.#showInfo('Share Space', fields.body, this.#infoButton('Copy Space link', fields.copy, true));
    fields.select();
  }
  #information(space?: PersistentSpace): void {
    const current=space?this.#activeSpace(space):undefined;if(space&&!current)return;
    const saved=element('div',{className:'kl-sp-saved-context',role:'status'}),body=element('div',{className:'kl-sp-info-body kl-sp-context'},element('header',{className:'kl-sp-context-heading'},element('h2',{text:current?'Space details':'Your rooms'}),kikiIcon('door')));
    if(current){
      body.append(element('p',{className:'kl-sp-context-room-note',text:!current.canRead?'Members only.':current.archived?'Room entry is paused for this archived Space.':!current.room?'No room has been linked yet.':this.#roomStatus===undefined?'Room status has not been checked.':this.#roomStatus===null?'Room is not listed.':`${this.#roomStatus.memberCount}/${this.#roomStatus.memberLimit} in the room.`}));
      if (current.canRead) {
        const roomDetails = this.#infoButton('Room details', () => {
          if (!this.#activeSpace(current)?.canRead) return;
          const trigger = this.#results.querySelector<HTMLButtonElement>('.kl-sp-detail button[aria-label="Space information"]') ?? undefined;
          this.#closeInfo();
          this.#openSection('room', trigger);
        });
        const actions = element('div', { className: 'kl-sp-context-actions' }, roomDetails);
        if (!current.archived && this.#upcoming.length) actions.append(this.#upcomingBody(current)[0]!);
        body.append(actions);
      }
      body.append(this.#infoButton('Share Space',()=>this.#share(current)),element('div',{className:'kl-sp-context-divider'}));
    }
    if (this.options.directory && this.#visible && !this.#selected) {
      this.#syncDirectoryCheck();
      const refresh = this.#infoButton('Refresh', () => {
        if (!this.#visible || this.#selected) return;
        this.#closeInfo();
        void this.refresh();
      });
      refresh.prepend(kikiIcon('refresh'));
      body.append(
        element('p', { className: 'kl-sp-context-room-note', text: roomStatusNote }),
        element('div', { className: 'kl-sp-context-actions' }, this.#checkRooms, refresh),
        element('div', { className: 'kl-sp-context-divider' }),
      );
    }
    body.append(element('h3',{text:'Saved Spaces'}),saved);
    if(this.options.openHistory){const history=this.#infoButton('Visit history',()=>{if(!body.isConnected||!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;this.#closeInfo();this.options.openHistory?.();});history.classList.add('kl-sp-context-history');body.append(history);}
    this.#showInfo(current?.name??'Your familiar places',body);if(!body.isConnected)return;this.#contextSpaceId=current?.id??null;
    const token=this.#infoToken,source=this.#source;let attempt=0;
    const valid=()=>token===this.#infoToken&&!this.#destroyed&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin&&saved.isConnected&&(!current||!!this.#activeSpace(current)&&sameSpaceSource(source,this.#source));
    const load=async()=>{
      const readToken=++attempt;if(!valid())return;saved.setAttribute('aria-busy','true');saved.textContent='Loading saved Spaces…';
      try{
        if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
        let read=spaceReadAt(this.client,source);
        if(!current){const me=await this.client.request<{memberNumber?:number;features?:{persistentSpaces?:boolean}}>('GET','/v1/me');if(!valid()||readToken!==attempt)return;if(me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new SpaceRecoveryError();if(!me.features?.persistentSpaces){saved.textContent='Spaces are not available on this Cloud yet.';return;}read=spaceRead(this.client,me).request;}
        const page=await read<Page<PersistentSpace>>(`${BASE}?scope=saved&limit=3`);if(!valid()||readToken!==attempt)return;
        saved.replaceChildren(...page.items.slice(0,3).map(s=>{
          const row=this.#infoButton(s.name,()=>{if(!valid()||readToken!==attempt||!this.client.connected)return;this.#closeInfo();if(this.options.openSpace)this.options.openSpace(s.id);else if(this.#visible)this.#openCard(s.id);});
          const observation=s.id===this.#space?.id?this.#roomStatus:observedSpaceRoom(s,this.#observations.get(s.id)),status=spaceDirectoryStatus(observation);
          const caption=!s.canRead?`${accessLabel(s.access)} Space`:s.archived?'Room entry paused':!s.room?'No linked room':observation?`${status==='open'?'Open':status==='full'?'Full':'Closed'} · ${observation.memberCount}/${observation.memberLimit} in room`:observation===null?'Room not listed':'Room status unknown';
          row.classList.add('kl-sp-saved-row');row.replaceChildren(this.#spaceIcon(s),element('span',{className:'kl-sp-row-copy'},element('strong',{text:s.name,title:s.name}),element('small',{text:caption})),kikiIcon('arrow-right'));return row;
        }));if(!page.items.length)saved.textContent='No saved Spaces.';
      }catch{if(valid()&&readToken===attempt)saved.replaceChildren(element('p',{text:this.client.connected?'Saved Spaces could not load.':'Reconnect to Cloud to load saved Spaces.'}),this.#infoButton('Retry saved Spaces',()=>{if(valid())void load();}));}
      finally{if(valid()&&readToken===attempt)saved.setAttribute('aria-busy','false');}
    };void load();
  }
  #roleBadge(role: string | null, showIcon = true): HTMLElement {
    const label = ({owner:'Owner',admin:'Administrator',moderator:'Moderator',member:'Member'} as Record<string,string>)[role ?? 'member'] ?? 'Member';
    const manager = role === 'owner' || role === 'admin';
    return element('span', { className: `kl-sp-badge kl-sp-role-badge${manager ? ' kl-sp-role-badge--gold' : ''}` },
      ...(manager && showIcon ? [kikiIcon('shield')] : []), label);
  }
  #roomBadge(space: PersistentSpace, observation?: SpaceRoomStatus | null, catalog = false): HTMLElement {
    const state = space.canRead && !space.archived ? spaceDirectoryStatus(observation) : '';
    const label = !space.canRead ? 'Members only' : space.archived ? 'Room entry paused' : !space.room ? 'No linked room'
      : roomStatusLabels[state];
    const openIcon = catalog ? 'door' : 'location';
    const badge = element('span', { className: 'kl-sp-badge kl-sp-room-badge' },
      kikiIcon(state === 'open' ? openIcon : state === 'full' ? 'users' : state === 'closed' || !space.canRead ? 'lock' : 'info'), label);
    badge.dataset.status = state;
    return badge;
  }
  #cover(space: PersistentSpace): HTMLElement {
    const cover = element('div', { className: 'kl-sp-cover', ariaHidden: 'true' });
    const room = space.canRead ? space.room : undefined;
    cover.dataset.tone = !space.canRead ? 'locked' : roomIllustrations.get(room?.background?.trim().toLowerCase() ?? '') ?? '0';
    if (room?.palette && workshopColor(room.palette.primary) && workshopColor(room.palette.secondary)) {
      cover.style.setProperty('--sp-wall', room.palette.secondary);
      cover.style.setProperty('--sp-furniture', room.palette.primary);
    }
    if (space.canRead) cover.append(element('div', { className: 'kl-sp-cover-art' }));
    return cover;
  }
  #card(s: PersistentSpace): HTMLElement {
    const article = element('article', { className: 'kl-sp-card' }); article.dataset.spaceId = s.id;
    const observed = observedSpaceRoom(s, this.#observations.get(s.id));
    const save=this.#button(s.saved?'Saved':'Save Space',()=>this.#save(s),'bookmark',s.saved);save.classList.add('kl-sp-card-save');save.title=s.saved?'Remove saved Space':'Save Space';save.setAttribute('aria-label',s.saved?'Remove saved Space':'Save Space');
    const open=this.#button('View Space',()=>this.#openCard(s.id),'arrow-right');open.classList.add('kl-sp-card-open');
    const more = iconButton(`${s.name} options`, 'more', () => this.#spaceMenu(s, more, true));
    more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
    article.append(this.#cover(s), element('div', { className: 'kl-sp-card-body' },
      element('div',{className:'kl-sp-card-heading'},this.#spaceIcon(s),element('div',{className:'kl-sp-card-heading-copy'},element('h2',{},pageResult(element('button',{type:'button',className:'kl-sp-title',text:s.name,title:s.name,onClick:()=>this.#openCard(s.id)}),s.id)),element('small',{text:s.communityName||'Independent Space'})),more),
      element('p', { className: 'kl-sp-description', text: s.description }),
      element('div',{className:'kl-sp-meta kl-sp-directory-room'},this.#roomBadge(s, observed, true),element('span',{},kikiIcon('globe'),element('span',{text:s.language})),...(observed?[element('span',{},kikiIcon('users'),element('span',{text:`${observed.memberCount}/${observed.memberLimit} in room`}))]:[])),
      element('div',{className:'kl-sp-card-tags'},this.#badge(accessLabel(s.access)),...(s.membership==='active'?[this.#roleBadge(s.role, false)]:[]),...(s.archived?[this.#badge('Archived')]:[]),...s.tags.slice(0,2).map(t=>this.#badge(t))),
      element('div',{className:'kl-sp-card-footer'},open,save)));return article;
  }
  #save(s: PersistentSpace): void { this.#mutate('PUT', `${BASE}/${s.id}/preferences`, { revision: s.preferencesRevision, saved: !s.saved },()=>{},s.recoverySource,`${s.saved?'Unsave space':'Save space'} · ${s.name}`); }
  #canOpenSection(space: PersistentSpace, tab: string): boolean {
    return space.canRead && (tab !== 'events' || this.#spaceEvents && !!this.options.openSpaceEvents) &&
      (tab !== 'audit' || space.canManage);
  }
  #openSection(tab: string, trigger?: HTMLButtonElement): void {
    trigger?.focus({ preventScroll: true });
    const tabs = trigger?.parentElement;
    if (tabs?.matches(detailTablist)) {
      for (const button of tabs.querySelectorAll<HTMLButtonElement>('button[role="tab"]')) {
        button.tabIndex = button === trigger ? 0 : -1;
      }
    }
    clearTimeout(this.#memberSearchTimer);this.#tab = tab; this.#members = []; this.#membersError=''; this.#audit = []; this.#auditPreviewError=''; this.#detailCursor=null; void this.refresh(false, false, trigger);
  }
  #revealSection(alignVertically = true): void {
    const tabs = this.#results.querySelector<HTMLElement>(detailTablist);
    const selected = tabs?.querySelector<HTMLButtonElement>('button[aria-selected="true"]');
    if (!tabs || !selected) return;
    revealDetailSection(selected, tabs, this.element, alignVertically);

    const events = this.#eventsPanel?.element;
    if (!alignVertically || this.#tab !== 'events' || !events || !this.#results.contains(events) || events.getAttribute('aria-busy') !== 'true') return;
    const token = this.#token;
    const scrollTop = this.element.scrollTop;
    // The embedded calendar's loading state can leave too little content to align the tab bar.
    this.#eventsReveal = new MutationObserver(() => {
      if (events.getAttribute('aria-busy') === 'true') return;
      this.#cancelEventsReveal();
      if (this.#valid(token) && this.#tab === 'events' && this.#results.contains(selected) &&
          this.#activeElement() === selected && this.element.scrollTop === scrollTop) {
        revealDetailSection(selected, tabs, this.element);
      }
    });
    this.#eventsReveal.observe(events, { attributes: true, attributeFilter: ['aria-busy'] });
  }
  #cancelEventsReveal(): void {
    this.#eventsReveal?.disconnect();
    this.#eventsReveal = undefined;
  }
  #activeElement(): Element | null {
    const root = this.element.getRootNode();
    const documentFocus = this.element.ownerDocument.activeElement;
    return root instanceof ShadowRoot && documentFocus === root.host ? root.activeElement : documentFocus;
  }
  #joinLabel(space: PersistentSpace): string | undefined {
    if (space.archived || !space.canJoin || space.membership === 'active' || space.membership === 'requested') return;
    if (space.membership === 'invited') return 'Accept invitation';
    if (space.access === 'request') return 'Request to join';
    if (space.access === 'public') return 'Join space';
  }
  #joinControl(space: PersistentSpace, icon?: KikiLinkIconName): HTMLButtonElement | undefined {
    const label = this.#joinLabel(space);
    if (!label) return;
    return this.#button(label, () => {
      const current = this.#activeSpace(space);
      if (current && this.#joinLabel(current) === label) this.#action(current, 'join');
    }, icon, undefined, true);
  }
  #restrictedAccess(space: PersistentSpace): HTMLElement {
    const join = this.#joinControl(space);
    const description = space.membership === 'invited' && join ? 'Accept the invitation to view the room and members.'
      : join ? 'Join this Space to view the room and members.' : 'The room and members are visible to Space members.';
    const community = space.communityId;
    const communityLink = community ? this.#button('View community', () => {
      if (this.#activeSpace(space)?.communityId === community) this.options.openCommunity(community);
    }) : undefined;
    return element('section', { className: 'kl-sp-panel kl-sp-access', ariaLabel: 'Space access' },
      kikiIcon('lock'), element('h2', { text: 'Members only' }), element('p', { text: description }), join,
      space.membership === 'requested' ? this.#membershipControl(space) : undefined, communityLink);
  }
  #detail(s: PersistentSpace): HTMLElement {
    if(this.#tab!=='gallery'||!s.canRead)this.#albums.setVisible(false);
    if(this.#tab!=='events'||!s.canRead||s.archived||!this.#spaceEvents){this.#eventsPanel?.setVisible(false);this.#eventsPanelSpace=undefined;}
    const root = element('div', { className: 'kl-sp-detail' }), header = element('section', { className: 'kl-sp-panel kl-sp-hero' });
    root.append(element('div', { className: 'kl-sp-path' }, this.#button('All spaces', () => this.#backToList(), 'back'),
      ...(this.options.directory ? [iconButton('Refresh', 'refresh', () => void this.refresh())] : [])));
    const save=this.#button(s.saved ? 'Saved' : 'Save', () => this.#save(s), 'bookmark', s.saved);save.classList.add('kl-sp-card-save');save.title=s.saved?'Remove saved Space':'Save Space';save.setAttribute('aria-label',s.saved?'Saved':'Save');
    const actions = element('div', { className: 'kl-sp-actions kl-sp-detail-actions' });
    const join = this.#joinControl(s, 'group-add');
    if (join) actions.append(join);
    const membership = this.#membershipControl(s);
    if (membership) actions.append(membership);
    actions.append(this.#roomBadge(s, this.#roomStatus));
    actions.append(element('span',{className:'kl-sp-grow'}));
    if (s.canManage) {const manage=this.#button('Manage', () => this.#edit(s), 'settings');manage.classList.add('kl-sp-manage');actions.append(manage);}
    if (s.canRestore && s.spaceArchived) actions.append(this.#button('Restore space', () => this.#confirm('Restore this space?', 'Its existing access and discovery settings will apply again.', 'Restore space', () => this.#action(s, 'archive', { archived: false }))));
    actions.append(save);
    actions.append(iconButton('Space information','info',()=>this.#information(s)));
    const share=iconButton('Share Space','copy',()=>this.#share(s)),more=iconButton('Space options','more',()=>this.#spaceMenu(s,more));more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');
    const headerActions=element('div',{className:'kl-sp-header-actions'},share,more);
    const meta = element('div', { className: 'kl-sp-meta kl-sp-detail-meta' },
      element('span', {}, kikiIcon(s.access === 'public' ? 'globe' : 'lock'), accessLabel(s.access)),
      s.canRead && s.memberCount !== null ? element('span', { text: `${s.memberCount} members` }) : undefined,
      element('span', { text: s.language }),
      s.archived ? this.#badge('Archived') : undefined,
      s.canManage && s.membership === 'active' ? this.#roleBadge(s.role) : undefined);
    header.append(element('div', { className: 'kl-sp-hero-body' },
      element('div', { className: 'kl-sp-detail-heading' },
        this.#spaceIcon(s),
        element('div', { className: 'kl-sp-detail-copy' }, element('h1', { text: s.name }), meta),headerActions),
      element('p', { className: 'kl-sp-detail-description', text: s.description }),
      actions));
    root.append(header);
    if (!s.canRead) {
      root.append(this.#restrictedAccess(s));
      return root;
    }
    const sections = [
      ['overview', 'Overview'], ['room', 'Room'], ['events', 'Events'],
      ['members', `Members · ${s.memberCount ?? 0}`], ['gallery', 'Gallery'],
      ['about', 'About'], ['audit', 'Activity'],
    ] as const;
    const tabs = element('div', { className: 'kl-sp-tabs', role: 'tablist', ariaLabel: 'Space sections' });
    const buttons: HTMLButtonElement[] = [];
    for (const [key, label] of sections) {
      if (!this.#canOpenSection(s, key)) continue;
      const button = this.#button(label, () => {
        const current = this.#activeSpace(s);
        if (current && this.#canOpenSection(current, key)) this.#openSection(key, button);
      });
      button.id = `kl-sp-${key}-tab`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(this.#tab === key));
      button.setAttribute('aria-controls', detailPanelId);
      button.tabIndex = this.#tab === key ? 0 : -1;
      buttons.push(button);
      tabs.append(button);
    }
    tabs.addEventListener('keydown', event => {
      if (!tabs.isConnected || !this.#activeSpace(s)?.canRead ||
          !(event.target instanceof HTMLButtonElement) || event.defaultPrevented || event.isComposing ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.disabled) return;
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
      event.stopPropagation();
      buttons[next]?.click();
    });
    const panel = element('section', { className: 'kl-sp-detail-panel', role: 'tabpanel', tabIndex: 0 });
    panel.id = detailPanelId;
    panel.setAttribute('aria-labelledby', `kl-sp-${this.#tab}-tab`);
    root.append(tabs, panel);
    if (this.#tab === 'gallery') {panel.append(this.#albums.element);this.#albums.open('space',s.id);}
    else if (this.#tab === 'events') {
      if (!s.archived) this.#eventsPanel??=this.options.createEventsPanel?.();
      if(!s.archived&&this.#eventsPanel){
        const accepted=this.#eventsPanelSpace===s.id||this.#eventsPanel.openSpace(s.id,s.name);
        if(accepted){this.#eventsPanelSpace=s.id;panel.append(this.#eventsPanel.element);this.#eventsPanel.setVisible(true);}
        else{this.#eventsPanel.setVisible(false);panel.append(element('section',{className:'kl-sp-panel'},element('p',{role:'status',text:'Finish or discard the previous event change in Events first.'}),this.#button('Open Events',()=>this.options.openEvents())));}
      }
      else panel.append(element('section',{className:'kl-sp-panel'},...this.#upcomingBody(s),sectionLink(this.#button('Explore events',()=>this.options.openSpaceEvents?.(s.id,s.name)))));
    }
    else if (this.#tab === 'members') panel.append(this.#memberPanel(s));
    else if (this.#tab === 'room') panel.append(this.#roomPanel(s));
    else if (this.#tab === 'audit') {
      const activity = element('section', { className: 'kl-sp-panel kl-sp-detail-section kl-sp-audit-panel' },
        element('header',{className:'kl-sp-section-heading'},element('h2', { text: 'Recent activity' })),
        element('p', { className: 'kl-sp-audit-help', text: 'Changes from the last 30 days. Visible to Space managers.' }));
      if(this.#auditPreviewError)activity.append(element('p',{className:'kl-sp-small-empty',role:'status',text:this.#auditPreviewError}),this.#button('Retry activity',()=>void this.refresh(!!this.#detailCursor&&this.#audit.length>0),'refresh'));
      if(!this.#audit.length&&!this.#auditPreviewError)activity.append(element('p',{className:'kl-sp-small-empty',text:'No recent activity.'}));
      for (const a of this.#audit) activity.append(this.#activityRow(a));
      if (this.#detailCursor&&!this.#auditPreviewError) {const more=pageAction(this.#button('Load more activity', () => void this.refresh(true)));more.disabled ||= this.#loading;activity.append(more);} panel.append(activity);
    } else {
      const overview = this.#tab === 'overview';
      const section = (title: string, body: HTMLElement[], action?: HTMLElement) => element('section', { className: 'kl-sp-panel kl-sp-detail-section' },
        element('header', { className: 'kl-sp-section-heading' }, element('h2', { text: title }), action), ...body);
      if (overview) {
        const editAnnouncement = s.canManage && !s.archived ? this.#button('Edit', () => this.#openQuickEdit(s, 'announcement')) : undefined;
        editAnnouncement?.classList.add('kl-sp-announcement-edit');
        editAnnouncement?.setAttribute('aria-haspopup', 'dialog');
        const announcement = section('Announcement', [element('p', { text: s.announcement || 'No announcement.' })], editAnnouncement);
        const viewRoom = this.#button('View room', () => {
          if (this.#activeSpace(s)?.canRead) this.#openSection('room', viewRoom);
        });
        sectionLink(viewRoom);
        const room = section('Room', [this.#roomBadge(s, this.#roomStatus),
          element('p', { text: s.room ? s.room.name : 'A room has not been linked yet.' }), viewRoom]);
        const allEvents = this.#button(this.#canOpenSection(s, 'events') ? 'All events' : 'Browse events', () => this.#allEvents(s, allEvents));
        const upcoming=section('Coming up',this.#upcomingBody(s),sectionLink(allEvents));
        const activity = section('Activity', [], s.canManage && (this.#audit.length > 0 || this.#auditPreviewError) ? sectionLink(this.#button('All activity', () => this.#openSection('audit'))) : undefined);
        if (!s.canManage) activity.append(element('p', { className: 'kl-sp-small-empty', text: 'Activity is shared with Space managers.' }));
        else if (this.#auditPreviewError) activity.append(element('p', { className: 'kl-sp-small-empty', role: 'status', text: this.#auditPreviewError }));
        else if (!this.#audit.length) activity.append(element('p', { className: 'kl-sp-small-empty', text: 'No recent activity.' }));
        else for (const entry of this.#audit.slice(0, 4)) activity.append(this.#activityRow(entry));
        panel.append(element('div', { className: 'kl-sp-detail-grid' }, announcement, room, upcoming, activity));
      } else {
        const about=section('About this Space',[element('p',{text:s.description}),element('div',{className:'kl-sp-card-tags'},...s.tags.map(tag=>this.#badge(tag)))]);
        const created=new Date(s.createdAt),facts=element('dl',{className:'kl-sp-about-facts'});
        for(const [label,value] of [['Access',accessLabel(s.access)],['Language',s.language],['Created',Number.isNaN(created.getTime())?'Unavailable':created.toISOString().slice(0,10)],['Community',s.communityName??'Independent Space']]){
          const dd=element('dd');if(label==='Community'&&s.communityId)dd.append(this.#button(value!,()=>this.options.openCommunity(s.communityId!)));else dd.textContent=value!;
          facts.append(element('div',{},element('dt',{text:label!}),dd));
        }
        about.append(facts);if(this.#spaceReports&&!s.archived)about.append(this.#button('Report Space',()=>this.#report(s),'flag'));
        const rules=section('A few shared agreements',[element('ol',{className:'kl-sp-about-rules'},...(s.rules??[]).map(rule=>element('li',{text:rule})))]);
        const note=this.#notes.get(s.id),noteError=this.#notes.error;
        const privateNote=section('Your private note',[element('p',{className:'kl-sp-note-help',text:'Only you can see this note.'}),element('p',{className:'kl-sp-note-copy',text:noteError||note||'Keep a little reminder about this place.'})],!s.archived?this.#button(note?'Edit note':'Add note',()=>this.#editNote(s)):undefined);
        privateNote.classList.add('kl-sp-note-section');if(noteError)privateNote.setAttribute('data-error','true');
        panel.append(element('div',{className:'kl-sp-detail-grid'},about,rules,privateNote));
      }
    }
    return root;
  }
  #activityRow(entry: Audit): HTMLElement {
    return element('div', { className: 'kl-sp-activity' }, element('span', { className: 'kl-sp-activity-dot', ariaHidden: 'true' }),
      element('div', {}, element('p', { text: `${entry.action.replaceAll('_', ' ')}${entry.target ? ` · #${entry.target}` : ''}` }),
        element('small', {}, `${this.options.name(entry.actor)} · `, bindClockText(element('time'), entry.createdAt, 'medium-date-time'))));
  }
  #memberPanel(s: PersistentSpace): HTMLElement {
    const states:Record<string,string>={active:'People who make this place',requested:'Join requests',invited:'Invited people',banned:'Banned people'};
    const heading=element('header',{className:'kl-sp-section-heading'},element('h2',{text:states[this.#memberState]??'People who make this place'}));
    if(s.canManage){
      const manage=iconButton('Manage Space members','more',()=>{
        if(manage.disabled||!manage.isConnected||!this.#activeSpace(s)?.canManage)return;
        const actions:ShellAction[]=[...([['active','Members'],['requested','Requests'],['invited','Invited'],['banned','Banned']] as const).map(([key,label])=>({label,checked:this.#memberState===key,run:()=>{
          if(!this.#activeSpace(s)?.canManage)return;clearTimeout(this.#memberSearchTimer);this.#memberState=key;this.#memberQuery='';this.#memberRole='';this.#members=[];this.#membersError='';this.#detailCursor=null;void this.refresh();
        }})),{label:'Invite person',icon:'group-add',separator:true,run:()=>{if(this.#activeSpace(s)?.canManage)this.#invite(s);}}];
        this.#closeMemberMenu(false);
        this.#menu.open(manage,'Manage Space members',actions,undefined,true,false);
      });
      manage.classList.add('kl-sp-members-manage');manage.disabled=this.#busy||!!this.#pending;heading.append(manage);
    }
    const input=element('input',{type:'search',ariaLabel:'Search Space members',placeholder:'Find a familiar face…'});input.maxLength=80;input.value=this.#memberQuery;input.disabled=this.#busy||!!this.#pending;
    input.addEventListener('keydown',event=>event.stopPropagation());
    const filtered=()=>{
      if(!input.isConnected||input.disabled||!this.#activeSpace(s)?.canRead)return;
      this.#memberQuery=input.value;this.#paintMemberRows(s);clearTimeout(this.#memberSearchTimer);
      if(this.#detailCursor)this.#memberSearchTimer=setTimeout(()=>{if(this.#activeSpace(s)?.canRead)void this.refresh();},250);
    };
    input.addEventListener('input',filtered);
    const role=this.#select('Member role',[['','All roles'],['owner','Owner'],['admin','Administrator'],...(this.#spaceModerators?[['moderator','Moderator'] as [string,string]]:[]),['member','Member']],this.#memberRole,value=>{
      if(!role.isConnected||role.disabled||!this.#activeSpace(s)?.canRead)return;
      this.#memberRole=value;this.#paintMemberRows(s);clearTimeout(this.#memberSearchTimer);if(this.#detailCursor)void this.refresh();
    });role.disabled=this.#busy||!!this.#pending;
    return element('section',{className:'kl-sp-panel kl-sp-detail-section kl-sp-members'},heading,
      element('div',{className:'kl-sp-member-search-row'},searchField(input,'Clear member search'),role),this.#memberRows(s));
  }
  #paintMemberRows(s: PersistentSpace): void {
    const body = this.#results.querySelector('.kl-sp-members-body');
    const current = this.#activeSpace(s);
    if (!body || !current?.canRead) return;
    this.#closeMemberMenu(true);
    this.#menu.close(false);
    const focused = this.#focusedMemberOption();
    body.replaceWith(this.#memberRows(current));
    if (focused) this.#restoreMemberOptionFocus(focused);
  }
  #focusedMemberOption(): string | undefined {
    const active = this.#activeElement();
    if (active?.matches('.kl-sp-member-more') && this.#results.contains(active)) {
      return active.closest<HTMLElement>('.kl-sp-member-row')?.dataset.memberNumber;
    }
  }
  #restoreMemberOptionFocus(memberNumber: string): void {
    if (!this.#valid(this.#token)) return;
    const row = [...this.#results.querySelectorAll<HTMLElement>('.kl-sp-member-row')]
      .find(candidate => candidate.dataset.memberNumber === memberNumber);
    const trigger = row?.querySelector<HTMLButtonElement>('.kl-sp-member-more:not(:disabled)');
    (trigger ?? this.#results.querySelector<HTMLButtonElement>(`${detailTablist} > button[aria-selected="true"]`) ??
      this.#results.querySelector<HTMLButtonElement>('.kl-sp-path > button'))?.focus({ preventScroll: true });
  }
  #memberRows(s: PersistentSpace): HTMLElement {
    const body=element('div',{className:'kl-sp-members-body'}),grid=element('div',{className:'kl-sp-member-grid'});body.append(grid);
    if(this.#membersError){body.prepend(element('p',{className:'kl-sp-small-empty',role:'status',text:this.#membersError}));body.append(this.#button('Retry members',()=>void this.refresh(!!this.#detailCursor&&this.#members.length>0),'refresh'));if(!this.#members.length)return body;}
    const query=this.#memberQuery.trim().toLocaleLowerCase(),rank:Record<string,number>={owner:0,admin:1,member:2};
    const identities=this.#members.map(member=>({member,identity:this.options.member?.(member.memberNumber,false)??{name:this.options.name(member.memberNumber),searchable:false}}));
    const visible=identities.filter(({member,identity})=>(!this.#memberRole||member.role===this.#memberRole)&&(!query||[identity.name,identity.username??'',String(member.memberNumber),`#${member.memberNumber}`].some(value=>value.toLocaleLowerCase().includes(query))));
    visible.sort((a,b)=>(rank[a.member.role]??3)-(rank[b.member.role]??3)||a.identity.name.localeCompare(b.identity.name)||a.member.memberNumber-b.member.memberNumber);
    for(const {member:m,identity} of visible){
      const presentation=this.options.member?.(m.memberNumber,true)??identity;
      const avatar=presentation.avatar??element('span',{className:'kl-sp-member-avatar',ariaHidden:'true',text:identity.name.trim().slice(0,1).toUpperCase()||'#'});
      avatar.classList.add('kl-sp-member-avatar');
      const profile=this.#button('',()=>{if(this.#activeSpace(s)?.canRead)this.options.openProfile(m.memberNumber);});profile.classList.add('kl-sp-member-profile');profile.setAttribute('aria-label',`Open ${identity.name} profile`);
      profile.replaceChildren(avatar,element('span',{className:'kl-sp-row-copy'},element('strong',{text:identity.name,title:identity.name}),element('small',{text:presentation.status||'Status not shared'})));
      const role=element('span',{className:`kl-sp-badge kl-sp-member-role${m.role==='owner'||m.role==='admin'?' kl-sp-role-badge--gold':''}`,text:({owner:'Owner',admin:'Administrator',moderator:'Moderator',member:'Member'} as Record<string,string>)[m.role]??'Member'});
      const row=element('div',{className:'kl-sp-member-row'},profile,role);row.dataset.memberNumber=String(m.memberNumber);
      const actions = this.#memberActions(s, m, identity.name);
      if (actions.length) row.append(this.#memberOptions(s, m, identity.name, actions));
      grid.append(row);
    }
    if(!visible.length)grid.append(element('p',{className:'kl-sp-small-empty',text:query||this.#memberRole?this.#detailCursor?'No matches among loaded members.':'No members match those filters.':'No people to show in this view.'}));
    if(query&&identities.some(({identity})=>identity.searchable===false))body.append(element('p',{className:'kl-sp-member-search-note',text:'Search matches names and usernames available to you, plus member numbers.'}));
    if(this.#detailCursor){if(query||this.#memberRole)body.append(element('p',{className:'kl-sp-member-search-note',role:'status',text:'Filters apply to loaded members. Load more to include the remaining people.'}));if(!this.#membersError){const more=pageAction(this.#button('Load more people',()=>void this.refresh(true)));more.disabled ||=this.#loading;body.append(more);}}
    return body;
  }
  #memberOptions(s: PersistentSpace, m: Member, name: string, actions: ShellAction[]): HTMLButtonElement {
    const open = (last = false): boolean => {
      if (!more.isConnected || more.disabled || !this.#memberTarget(s, m, name)) return false;
      this.#menu.close(false);
      this.#memberMenu.open(more, name, actions, 'Space membership');
      if (this.#memberMenu.element.open) {
        this.#memberMenu.element.setAttribute('aria-label', 'Member options');
        if (last) this.#memberMenu.element.querySelector<HTMLButtonElement>('button:last-of-type:not(:disabled)')?.focus();
      } else this.#clearClosedMemberMenu();
      return true;
    };
    const more = iconButton(`${name} member options`, 'more', () => open());
    more.classList.add('kl-sp-member-more');
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-controls', this.#memberMenu.element.id);
    more.disabled = this.#busy || !!this.#pending;
    more.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
      if (open(event.key === 'ArrowUp')) { event.preventDefault(); event.stopPropagation(); }
    });
    return more;
  }
  #memberTarget(s: PersistentSpace, m: Member, name: string): PersistentSpace | undefined {
    const current = this.#activeSpace(s);
    if (!current?.canRead || !current.canManage || current.archived || this.#tab !== 'members' || this.#loading ||
        this.#busy || this.#pending || current.revision !== s.revision ||
        !sameSpaceSource(s.recoverySource ?? this.#source, this.#source) ||
        m.memberNumber === this.#owner || m.role === 'owner' || (m.role === 'admin' && !current.canTransfer) ||
        !this.#members.some(value => value.memberNumber === m.memberNumber && value.role === m.role && value.state === m.state)) return;
    const label = this.options.member?.(m.memberNumber, false)?.name ?? this.options.name(m.memberNumber);
    return label === name ? current : undefined;
  }
  #memberActions(s: PersistentSpace, m: Member, name: string): ShellAction[] {
    if (!s.canManage || s.archived || m.memberNumber === this.#owner || m.role === 'owner' ||
        (m.role === 'admin' && !s.canTransfer)) return [];
    const actions: ShellAction[] = [];
    const target = (requiresTransfer = false) => {
      const current = this.#memberTarget(s, m, name);
      if (current && (!requiresTransfer || current.canTransfer)) return current;
    };
    const action = (label: string, icon: KikiLinkIconName, decision: string,
      { extra = {}, confirm = false, danger = false, separator = false }: {
        extra?: Record<string, unknown>; confirm?: boolean; danger?: boolean; separator?: boolean;
      } = {}) => actions.push({ label, icon, danger, separator, run: () => {
      this.#clearClosedMemberMenu();
      if (!target(decision === 'role' && extra.role === 'admin')) return;
      const perform = () => {
        const current = target(decision === 'role' && extra.role === 'admin');
        if (current && (extra.role !== 'moderator' || this.#spaceModerators)) this.#action(current, `members/${m.memberNumber}`, { action: decision, ...extra });
      };
      if (confirm) this.#confirm(`${label} ${name}?`, `This changes their access to “${s.name}”.`, label, perform);
      else perform();
    } });
    if (m.state === 'requested') {
      action('Approve', 'check', 'approve');
      action('Decline', 'close', 'decline', { danger: true });
    } else if (m.state === 'invited') action('Revoke invitation', 'close', 'revoke', { confirm: true, danger: true });
    else if (m.state === 'banned') action('Unban', 'check', 'unban', { confirm: true });
    else {
      const roles = [
        { value: 'member', label: 'Make member', icon: 'users' },
        { value: 'moderator', label: 'Make moderator', icon: 'users' },
        { value: 'admin', label: 'Make administrator', icon: 'shield' },
      ] as const;
      for (const role of roles) {
        if (m.role !== role.value && (role.value !== 'moderator' || this.#spaceModerators) && (role.value !== 'admin' || s.canTransfer)) {
          action(role.label, role.icon, 'role', { extra: { role: role.value }, confirm: true });
        }
      }
      action('Remove', 'trash', 'remove', { confirm: true, danger: true, separator: actions.length > 0 });
      action('Ban', 'lock', 'ban', { confirm: true, danger: true });
    }
    if (s.canTransfer && m.state === 'active' && m.memberNumber !== s.owner) actions.push({
      label: 'Transfer ownership', icon: 'star', separator: actions.length > 0, run: () => {
        this.#clearClosedMemberMenu();
        if (!target(true)) return;
        this.#confirm('Transfer ownership?', `${name} will own “${s.name}”.`, 'Transfer ownership', () => {
          const current = target(true);
          if (current && current.owner !== m.memberNumber) this.#action(current, 'ownership', { memberNumber: m.memberNumber });
        });
      },
    });
    return actions;
  }
  #savedPresets(s: PersistentSpace): HTMLElement {
    const section=element('section',{className:'kl-sp-panel kl-sp-saved-presets'});
    if(!s.presets?.length&&!s.canManage)return section;
    const heading = element('header', { className: 'kl-sp-section-heading' }, element('h2', { text: 'Saved room presets' }));
    if (s.canManage) {
      const edit = this.#button('Edit presets', () => this.#editRoomPresets(s));
      if (s.room && !s.archived) {
        const save = this.#button('Save current room', () => this.#openQuickEdit(s, 'preset'), 'plus');
        save.classList.add('kl-sp-save-current-room');
        save.setAttribute('aria-haspopup', 'dialog');
        if ((s.presets?.length ?? 0) >= roomPresetLimit) {
          save.disabled = true;
          save.title = presetLimitNotice;
        }
        heading.append(element('div', { className: 'kl-sp-actions kl-sp-preset-actions' }, edit, save));
      } else heading.append(edit);
    }
    section.append(heading);
    if(!s.presets?.length){section.append(element('p',{className:'kl-sp-small-empty',text:'No named presets yet. Current room settings are kept with this Space.'}));return section;}
    for(const p of s.presets){
      const card=element('article',{className:'kl-sp-preset'},
        element('span',{className:'kl-sp-card-heading-icon',ariaHidden:'true'},kikiIcon('location')),
        element('div',{className:'kl-sp-preset-copy'},element('strong',{text:p.label}),
          element('p',{text:`${p.room.background} · ${p.room.capacity} places`})));
      if (s.canManage && !s.archived) {
        const apply = this.#button('Apply', () => this.#openPresetReview(s, p));
        apply.dataset.roomPresetId = p.id;
        apply.setAttribute('aria-haspopup', 'dialog');
        apply.setAttribute('aria-label', `Apply ${p.label}`);
        card.append(apply);
      }
      section.append(card);
    }
    return section;
  }
  #currentPresetReview({ space, preset }: PresetReview): PersistentSpace | undefined {
    const current = this.#activeSpace(space);
    if (!current?.canRead || !current.canManage || current.archived || this.#tab !== 'room' ||
        this.#loading || current.revision !== space.revision ||
        !sameSpaceSource(space.recoverySource ?? { required: false }, this.#source)) return;
    const latest = current.presets?.find(value => value.id === preset.id);
    if (latest && JSON.stringify(latest) === JSON.stringify(preset)) return current;
  }
  #focusPreset(spaceId: string, presetId: string): void {
    this.#focusEditTrigger(spaceId, 'room', `button[data-room-preset-id="${CSS.escape(presetId)}"]`);
  }
  #closePresetReview(review: PresetReview): void {
    if (this.#presetReview !== review) return;
    this.#close();
    this.#focusPreset(review.space.id, review.preset.id);
  }
  #openPresetReview(space: PersistentSpace, preset: SpacePreset): void {
    const review = { space, preset };
    if (this.#busy || this.#dialog.open || !this.#currentPresetReview(review) || this.#resumePersonalDraft()) return;
    this.#restorePending();
    if (this.#pending) return;

    this.#presetReview = review;
    const title = 'Apply room preset?';
    const keep = () => this.#closePresetReview(review);
    const cancel = this.#button('Keep settings', keep);
    const apply = this.#button('Apply preset', () => {
      if (this.#presetReview !== review || !this.#dialog.open || this.#busy || this.#pending || this.#loading) return;
      const current = this.#currentPresetReview(review);
      if (!current) { keep(); return; }
      const room = { ...preset.room, ...(this.#roomThemes ? {
        description: preset.room.description ?? '', palette: preset.room.palette ?? null,
      } : {}) };
      this.#saveSpaceSettings(current, { room }, current.recoverySource, 'Apply room preset', () => {
        this.#close();
        return this.#focusAfterEditRefresh(() => this.#focusPreset(space.id, preset.id));
      });
    }, undefined, undefined, true);
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(
      element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
        iconButton('Close dialog', 'close', keep)),
      element('div', { className: 'kl-room-dialog-body kl-sp-membership-confirm-body kl-sp-preset-confirm-body' },
        element('p', {}, element('strong', { text: preset.label })),
        element('p', { text: `${preset.room.name} · ${preset.room.background || 'Default'} · ${preset.room.capacity} places` }),
        element('p', { className: 'kl-sp-field-note', text: 'Members, gallery and Space content are kept. This updates the room settings saved in this Space.' })),
      element('footer', { className: 'kl-sp-actions kl-sp-membership-confirm-footer' }, cancel, apply));
    this.#showDialog();
    cancel.focus({ preventScroll: true });
  }
  #roomPanel(s: PersistentSpace): HTMLElement {
    const section = element('div', { className: 'kl-sp-room-detail' });
    if (!s.room) {
      section.append(element('section', { className: 'kl-sp-panel' }, element('h2', { text: 'The room' }),
        element('p', { text: 'A room has not been linked yet.' })), this.#savedPresets(s));
      return section;
    }
    const room = s.room, status = this.#roomStatus;
    const availability = spaceDirectoryStatus(status);
    const fact = (label: string, value: string) => element('div', {}, element('dt', { text: label }), element('dd', { text: value }));
    const details = element('div', { className: 'kl-sp-room-info' },
      element('header', { className: 'kl-sp-room-heading' }, element('div', {},
        element('h2', { text: room.name }), element('p', { text: 'Room preview' })), this.#roomBadge(s, status)),
      element('p', { text: room.description || s.description }),
      element('dl', { className: 'kl-sp-room-facts' },
        fact('Occupancy', status ? `${status.memberCount} / ${status.memberLimit}` : `${room.capacity} planned places`),
        fact('Background', room.background || 'Default'),
        this.#roomOpening ? fact('On opening', room.restoreOnOpen !== false ? 'Restore saved settings' : 'Fresh defaults')
          : fact('Lobby', room.searchSpace === 'M' ? 'Male' : room.searchSpace === 'X' ? 'Mixed' : 'Female')));
    const feedback = element('p', { role: 'status', text: this.#roomBusy ? 'Checking the room…' : status === undefined ? 'Room availability has not been checked.'
      : status === null ? 'Not listed in the current BC search. It may be private, unavailable or outside the search results.'
        : `${status.memberCount}/${status.memberLimit} in the room${status.locked ? ' · Locked' : ''}${!status.canJoin ? ' · Entry unavailable' : ''}` });
    const check = this.#button('Check availability', () => this.#openRoomCheck(s, room), 'refresh');
    check.classList.add('kl-sp-room-check');
    check.setAttribute('aria-haspopup', 'dialog');
    check.disabled ||= this.#roomBusy || s.archived;
    const join = this.#button('Enter BC room', () => this.#openRoomEntry(s, room), 'door', undefined, true);
    join.classList.add('kl-sp-room-entry');
    join.setAttribute('aria-haspopup', 'dialog');
    join.disabled ||= this.#roomBusy || s.archived || (status !== undefined && availability !== 'open');
    if (s.archived) join.title = 'Room entry is paused for this archived Space.';
    else if (availability === 'full') join.title = 'This BC room is full.';
    else if (availability === 'closed') join.title = 'This BC room is not currently available to enter.';
    else if (status === null) join.title = 'Check availability to look for the linked room again.';
    const actions = element('div', { className: 'kl-sp-actions kl-sp-room-actions' }, join, check);
    if (this.#roomOpening && s.canManage && this.options.prepareRoom) {
      const setup = this.#button('Open room setup', () => this.#openRoomSetup(s), 'settings');
      setup.classList.add('kl-sp-room-setup');
      setup.setAttribute('aria-haspopup', 'dialog');
      setup.disabled ||= s.archived;
      actions.append(setup);
    }
    if (s.canManage && !s.archived) {
      const settings = this.#button('Room settings', () => this.#openRoomSettings(s));
      settings.classList.add('kl-sp-room-settings');
      settings.setAttribute('aria-haspopup', 'dialog');
      actions.append(settings);
    }
    details.append(actions, feedback, element('p', { className: 'kl-sp-meta', text: 'Joining this space does not enter the BC room. The game decides room access and available places.' }));
    section.append(element('section', { className: 'kl-sp-panel kl-sp-room-card' }, this.#cover(s), details), this.#savedPresets(s));
    return section;
  }
  #currentRoomReview(space: PersistentSpace, room: SpaceRoom): PersistentSpace | undefined {
    const latest = this.#activeSpace(space);
    if (this.#tab !== 'room' || !latest?.canRead || latest.archived || latest.revision !== space.revision ||
        !sameSpaceSource(space.recoverySource ?? { required: false }, this.#source) ||
        !latest.room || spaceRoomIdentity(latest.room) !== spaceRoomIdentity(room)) return;
    return latest;
  }
  #openRoomCheck(space: PersistentSpace, room: SpaceRoom): void {
    const current = () => this.#currentRoomReview(space, room);
    if (this.#loading || this.#busy || this.#roomBusy || this.#dialog.open || !current() || this.#resumePersonalDraft()) return;
    this.#restorePending();
    if (this.#pending) return;

    const cancel = () => {
      if (this.#roomCheck !== review) return;
      this.#close();
      this.#focusEditTrigger(space.id, 'room', roomCheckTrigger);
    };
    const review = { current, cancel };
    const result = element('div', { className: 'kl-sp-room-check-result', role: 'status' });
    const done = this.#button('Done', cancel);
    const run = async () => {
      if (this.#roomCheck !== review || this.#roomBusy || this.#loading || this.#busy || this.#pending) return;
      const latest = current();
      if (!latest) { cancel(); return; }
      if (this.#activeElement() === retry) done.focus({ preventScroll: true });
      retry.hidden = true;
      result.replaceChildren(element('p', { text: 'Checking room availability…' }));
      const outcome = await this.#roomAction(latest, false);
      if (this.#roomCheck !== review) return;
      if (!outcome || !current()) { cancel(); return; }
      if ('error' in outcome) {
        result.replaceChildren(element('p', { text: outcome.error }));
        retry.hidden = false;
        if (this.#activeElement() === done) retry.focus({ preventScroll: true });
        return;
      }
      const status = outcome.status;
      result.replaceChildren(
        element('p', {}, 'The current BC result is ', element('strong', { text: roomStatusLabels[spaceDirectoryStatus(status)] }), '.'),
        element('p', { className: 'kl-sp-field-note', text: status
          ? `${status.memberCount}/${status.memberLimit} in the room.${status.locked ? ' The room is locked.' : ''}`
          : 'The room was not listed in the current BC search.' }));
    };
    const retry = this.#button('Retry', () => void run(), 'refresh', undefined, true);
    retry.hidden = true;
    const title = 'Check room availability';
    this.#roomCheck = review;
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(
      element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
        iconButton('Close dialog', 'close', cancel)),
      element('div', { className: 'kl-room-dialog-body kl-sp-membership-confirm-body kl-sp-room-check-body' }, result),
      element('footer', { className: 'kl-sp-actions kl-sp-membership-confirm-footer' }, done, retry));
    this.#showDialog();
    done.focus({ preventScroll: true });
    void run();
  }
  #openRoomEntry(space: PersistentSpace, room: SpaceRoom): void {
    const current = () => {
      if (this.#roomStatus !== undefined && spaceDirectoryStatus(this.#roomStatus) !== 'open') return;
      return this.#currentRoomReview(space, room);
    };
    if (this.#loading || this.#busy || this.#roomBusy || this.#dialog.open || !current() || this.#resumePersonalDraft()) return;
    this.#restorePending();
    if (this.#pending) return;

    const cancel = () => {
      if (this.#roomEntry !== entry) return;
      this.#close();
      this.#focusEditTrigger(space.id, 'room', roomEntryTrigger);
    };
    const entry = { current, cancel };
    const stay = this.#button('Stay here', cancel);
    const enter = this.#button('Enter room', () => {
      if (this.#roomEntry !== entry || !this.#dialog.open || this.#loading || this.#roomBusy || this.#busy || this.#pending) return;
      const latest = current();
      if (!latest) { cancel(); return; }
      this.#close();
      void this.#roomAction(latest, true);
    }, undefined, undefined, true);
    const title = 'Enter this BC room?';
    const status = this.#roomStatus;
    const places = status ? status.memberLimit - status.memberCount : undefined;
    this.#roomEntry = entry;
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(
      element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
        iconButton('Close dialog', 'close', cancel)),
      element('div', { className: 'kl-room-dialog-body kl-sp-membership-confirm-body kl-sp-room-entry-body' },
        element('p', {}, element('strong', { text: room.name }),
          places === undefined ? ' is the room linked to this Space.' :
            ` had ${places} free ${places === 1 ? 'place' : 'places'} at the last check.`),
        element('p', { text: 'If you are in another room, joining will leave it.' }),
        element('p', { className: 'kl-sp-field-note', text: 'Room availability will be checked again before joining.' })),
      element('footer', { className: 'kl-sp-actions kl-sp-membership-confirm-footer' }, stay, enter));
    this.#showDialog();
    stay.focus({ preventScroll: true });
  }
  #openRoomSetup(space: PersistentSpace): void {
    const prepare = this.options.prepareRoom;
    const source = space.recoverySource ?? { required: false };
    const current = () => {
      const latest = this.#activeSpace(space);
      return this.#roomOpening && this.#tab === 'room' && !!latest?.canRead && latest.canManage &&
        !latest.archived && !!latest.room && latest.revision === space.revision && sameSpaceSource(source, this.#source);
    };
    if (!prepare || !space.room || !current() || this.#loading || this.#busy || this.#dialog.open || this.#resumePersonalDraft()) return;
    this.#restorePending();
    if (this.#pending) return;

    const cancel = () => {
      if (this.#roomSetup !== setup) return;
      this.#close();
      this.#focusEditTrigger(space.id, 'room', roomSetupTrigger);
    };
    const setup = { current, cancel };
    const active = () => this.#roomSetup === setup && this.#dialog.open && current();
    const valid = () => active() && this.#dialog.contains(select);
    let choice = space.room.restoreOnOpen !== false ? 'current' : 'fresh';
    let working = false;
    const preview = element('div', { className: 'kl-sp-review kl-sp-room-setup-preview', role: 'status' });
    const error = element('p', { className: 'kl-sp-error', role: 'alert' });
    const paint = () => {
      preview.replaceChildren();
      error.textContent = '';
      try {
        const room = openingRoom(space, choice);
        const lobby = room.searchSpace === 'M' ? 'Male' : room.searchSpace === 'X' ? 'Mixed' : 'Female';
        preview.append(element('strong', { text: room.name }),
          element('p', { text: `${room.capacity} planned places · ${room.background || 'Default'} · ${lobby} search` }));
        if (room.description) preview.append(element('p', { text: room.description }));
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Room settings are unavailable.';
      }
    };
    const options: Array<[string, string]> = [['current', 'Current saved settings'], ['fresh', 'Fresh room defaults · Lounge · 30 places']];
    for (const { id, label, room } of space.presets ?? []) {
      options.push([id, `${label} · ${room.background || 'Default'} · ${room.capacity} places`]);
    }
    const select = this.#select('Room settings to prepare', options, choice, value => {
      if (working || !valid()) return;
      choice = value;
      paint();
    });
    const submit = this.#button('Prepare editable settings', () => {
      if (working || this.#loading || !valid()) return;
      working = true;
      submit.disabled = select.disabled = true;
      if (create) create.disabled = true;
      error.textContent = '';
      void (async () => {
        const me = await this.client.request<{memberNumber: number; features?: {roomOpening?: boolean}}>('GET', '/v1/me');
        if (!valid()) return;
        if (me.memberNumber !== this.client.memberNumber || me.features?.roomOpening !== true) throw new Error('Room setup needs the pending Cloud update.');
        if (!sameSpaceSource(spaceRead(this.client, me).source, source)) throw new SpaceRecoveryError();
        const latest = await spaceReadAt(this.client, source)<PersistentSpace>(`${BASE}/${space.id}`);
        if (!valid()) return;
        if (latest.id !== space.id || latest.revision !== space.revision || !latest.canManage || !latest.canRead || latest.archived ||
            JSON.stringify([latest.room, latest.presets]) !== JSON.stringify([space.room, space.presets])) {
          throw new Error('The Space changed. Close this review and open room setup again.');
        }
        await prepare.call(this.options, openingRoom(latest, choice), { ...latest, recoverySource: source });
        if (valid()) this.#close();
      })().catch(cause => {
        if (valid()) error.textContent = cause instanceof CloudError || cause instanceof SpaceRecoveryError ? failure(cause) :
          cause instanceof Error ? cause.message : 'Room setup is unavailable.';
      }).finally(() => {
        if (!valid()) return;
        working = false;
        submit.disabled = select.disabled = false;
        if (create) create.disabled = false;
      });
    }, undefined, undefined, true);
    const createRoom = this.options.createRoom;
    const create = createRoom ? this.#button('Review new BC room', () => {
      if (working || this.#loading || !valid()) return;
      let room: SpaceRoom;
      try {
        room = openingRoom(space, choice);
      } catch (cause) {
        error.textContent = cause instanceof Error ? cause.message : 'Room settings are unavailable.';
        return;
      }
      const reviewing = () => active() && this.#dialog.contains(review.element);
      const review = new SpaceRoomCreationReview(room, { current: reviewing, cancel,
        create: draft => createRoom.call(this.options, draft, { ...structuredClone(space), recoverySource: source }, reviewing) });
      this.#dialog.setAttribute('aria-label', 'Create a BC room');
      this.#dialog.replaceChildren(review.element);
      review.element.querySelector<HTMLElement>('input')?.focus({ preventScroll: true });
    }) : undefined;

    const title = 'Prepare room settings';
    this.#roomSetup = setup;
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(
      element('header', { className: 'kl-room-dialog-heading' },
        element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
        iconButton('Close dialog', 'close', cancel)),
      element('div', { className: 'kl-room-dialog-body kl-sp-quick-editor kl-sp-room-setup-body' },
        element('label', {}, element('span', { text: 'Room settings to prepare' }), select), preview,
        element('p', { className: 'kl-sp-field-note', text: create
          ? 'Prepare an editable draft as an administrator of the linked BC room, or review settings for a new BC room.'
          : 'Prepare an editable draft as an administrator of the linked BC room.' }), error),
      element('footer', { className: 'kl-sp-actions kl-sp-quick-footer' }, this.#button('Cancel', cancel), create, submit));
    paint();
    this.#showDialog();
    select.focus({ preventScroll: true });
  }
  async #roomAction(space: PersistentSpace, join: boolean): Promise<RoomCheckResult | undefined> {
    const room = space.room;
    if (this.#roomBusy || !room || !space.canRead || space.archived) return;
    const epoch = this.#epoch, task = ++this.#roomToken;
    const valid = () => epoch === this.#epoch && task === this.#roomToken && !!this.#currentRoomReview(space, room);
    this.#roomBusy = true; this.#error = ''; this.#render();
    try {
      const read = spaceReadAt(this.client, space.recoverySource);
      const path = `${BASE}/${space.id}`;
      const matches = (latest: PersistentSpace) => latest.id === space.id && latest.canRead && !latest.archived &&
        latest.revision === space.revision && latest.room && spaceRoomIdentity(latest.room) === spaceRoomIdentity(room);
      const before = await read<PersistentSpace>(path);
      if (!valid()) return;
      if (!matches(before)) { await this.refresh(); return; }
      const status = await this.options.checkRoom(room);
      if (!valid()) return;
      const after = await read<PersistentSpace>(path);
      if (!valid()) return;
      if (!matches(after)) { await this.refresh(); return; }
      this.#roomStatus = status;
      if (!join) return { status };
      if (!status || spaceDirectoryStatus(status) !== 'open') {
        this.#error = 'This room is not currently available to enter.';
        return;
      }
      await this.options.joinRoom({ ...room, name: status.name }, valid, space.id, space.recoverySource);
    } catch (error) {
      if (!valid()) return;
      const message = error instanceof CloudError || error instanceof SpaceRecoveryError ? failure(error) :
        join ? 'The BC room could not be checked or entered. Refresh and try again.' : 'The BC room could not be checked. Try again.';
      if (error instanceof CloudError && [401, 403, 404].includes(error.status)) {
        this.#clearPrivate(); this.#roomToken++;
        this.#error = message;
      } else if (join || !this.#roomCheck) this.#error = message;
      else return { error: message };
    } finally {
      if (epoch === this.#epoch && (task === this.#roomToken || !this.#space)) {
        this.#roomBusy = false;
        if (this.#visible) this.#render();
      }
    }
  }
  #action(space: PersistentSpace, action: string, extra: Record<string, unknown> = {}): void {
    const label=action==='join'?(space.membership==='invited'?'Accept invitation':space.access==='request'?'Request to join':'Join space'):action==='leave'?(space.membership==='invited'?'Decline invitation':space.membership==='requested'?'Withdraw request':'Leave space'):action==='archive'?(extra.archived?'Archive space':'Restore space'):action==='ownership'?'Transfer ownership':action==='invite'?'Invite person':'Change membership';
    this.#mutate('POST', `${BASE}/${space.id}/${action}`, { revision: space.revision, ...extra }, () => this.#close(),space.recoverySource,`${label} · ${space.name}`);
  }
  #restorePending():void{if(this.#pending?.intent&&!this.#pending.intent.active)this.#pending=undefined;if(this.#pending)return;const intent=pendingSpaceChanges(this.client)[0];if(intent)this.#pending={intent,method:intent.method,path:intent.path,body:intent.body,done:()=>{this.#editor=undefined;this.#close();}};}
  #mutate(method: 'POST' | 'PUT', path: string, body: Record<string, unknown>, done: Pending['done'] = () => {}, source:SpaceRecoverySource={required:false},label='Space change'): void {
    this.#restorePending();if (this.#busy || this.#pending || !this.client.connected || !this.options.current()){this.#render();return;}
    const original=structuredClone({...body,operationId:crypto.randomUUID()});
    this.#pending = { method,path,body:original,done,...source.generation||source.required?{intent:new SpaceMutationIntent(this.client,method,path,original,source,label)}:{} };void this.#submit();
  }
  async #submit(): Promise<void> {
    const pending = this.#pending; if (!pending || this.#busy || !this.client.connected || !this.options.current()) return;
    const epoch = this.#epoch; this.#busy = true; this.#error = ''; const viewToken=++this.#token; this.#roomToken++; this.#roomBusy = false; this.#render(); if (this.#editor) this.#paintEditor();
    for (const control of this.#dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,textarea,select,button')) control.disabled = true;
    let afterRefresh: void | (() => void) = undefined;
    try {
      const receipt=pending.intent?await pending.intent.send(()=>epoch===this.#epoch&&viewToken===this.#token&&this.#visible&&!this.#destroyed&&this.options.current()&&this.#pending===pending):await this.client.request<{spaceId:string}>(pending.method,pending.path,pending.body);
      if(!receipt||epoch!==this.#epoch||!this.options.current())return; pending.intent?.release();this.#pending = undefined; afterRefresh = pending.done(receipt); this.options.changed();
    } catch (error) {
      if (epoch !== this.#epoch || !this.options.current()) return;
      const definitive = error instanceof CloudError && error.status >= 400 && error.status < 500;
      this.#error = definitive ? failure(error) : 'The result is not confirmed. Retry the same request.';
      if (definitive&&!pending.intent) {
        this.#pending = undefined;
        if (this.#editor?.space && error.status === 409) {
          try { const latest = await this.client.request<PersistentSpace>('GET', `${BASE}/${this.#editor.space.id}`); if (epoch !== this.#epoch || !this.options.current()) return; if (latest.canManage && this.#editor) this.#editor.conflict = latest; else { this.#editor = undefined; this.#close(); } }
          catch { if (epoch === this.#epoch) { this.#editor = undefined; this.#close(); } }
        }
      }
      if (this.#editor) this.#editor.error = this.#error; if(pending.intent||!this.#editor)this.#close();
    } finally {
      if (epoch === this.#epoch) {
        this.#busy = false;
        if (this.#visible) { const error = this.#error; await this.refresh(false, true); if (epoch !== this.#epoch) return; if (error) this.#error = error; this.#render(); if (this.#editor&&!this.#pending?.intent) this.#paintEditor();if(this.#pending?.intent)this.element.scrollTop=0; afterRefresh?.(); }
      }
    }
  }
  #showDialog(): void {
    if (this.#dialog.open || !this.#dialog.isConnected) return;
    this.#dialog.showModal();
    fitPanelDialog(this.#dialog);
    this.#focusEditorField();
  }
  #focusEditorField(): void {
    const field = this.#dialog.querySelector<HTMLElement>('.kl-sp-form :is(input,select,textarea):not(:disabled), .kl-sp-quick-editor :is(input,textarea):not(:disabled)');
    field?.focus({ preventScroll: true });
  }
  #close(): void { this.#presetReview = undefined; this.#roomSetup = undefined; this.#roomEntry = undefined; this.#roomCheck = undefined; if (this.#dialog.open) this.#dialog.close(); this.#dialog.replaceChildren(); this.#dialog.setAttribute('aria-label', 'Space dialog'); }
  #requestClose(force = false): void {
    if (this.#busy && !force) return;
    if (this.#presetReview) { this.#closePresetReview(this.#presetReview); return; }
    if (this.#roomSetup) { this.#roomSetup.cancel(); return; }
    if (this.#roomEntry) { this.#roomEntry.cancel(); return; }
    if (this.#roomCheck) { this.#roomCheck.cancel(); return; }
    const editor = this.#editor;
    if (!force && editor && (editor.presetName || JSON.stringify(editor.draft) !== editor.baseline) && !this.#pending) {
      editor.discard = true; this.#paintEditor(); return;
    }
    const onCancel = this.#editor?.onCancel;
    this.#editor = undefined; this.#close(); onCancel?.();
  }
  #confirm(title: string, copy: string, label: string, action: () => void): void {
    this.#dialog.replaceChildren(element('h2', { text: title }), element('p', { text: copy }), element('div', { className: 'kl-sp-actions' }, this.#button('Cancel', () => this.#close()), this.#button(label, action, undefined, undefined, true))); this.#showDialog();
  }
  #invite(space: PersistentSpace): void {
    const input = element('input', { type: 'number', ariaLabel: 'Member number' }); input.min = '1'; input.inputMode = 'numeric';
    const error = element('p', { role: 'alert' });
    this.#dialog.replaceChildren(element('h2', { text: 'Invite a person' }), element('p', { text: 'They can accept in Inbox or Spaces → Invitations. Invitations expire after seven days.' }), element('label', {}, element('span', { text: 'Member number' }), input), error, element('div', { className: 'kl-sp-actions' }, this.#button('Cancel', () => this.#close()), this.#button('Send invitation', () => {
      const memberNumber = Number(input.value); if (!Number.isSafeInteger(memberNumber) || memberNumber <= 0) { error.textContent = 'Enter a valid member number.'; return; } this.#action(space, 'invite', { memberNumber });
    }, 'group-add', undefined, true))); this.#showDialog();
  }
  #edit(space?: PersistentSpace, options: Pick<Editor, 'onCancel' | 'quick' | 'roomEntry'> = {}): void {
    if(this.#editor?.source.generation){this.#paintEditor();this.#showDialog();return;}
    if (!this.#supported || this.#pending || space && !space.canManage) return;
    const draft: Draft = { name: space?.name ?? '', description: space?.description ?? '', language: space?.language ?? 'English', tags: space?.tags.join(', ') ?? '', communityId: space?.communityId ?? this.#communityId ?? '', access: space?.access ?? 'public', discoverable: String(space?.discoverable ?? true), announcement: space?.announcement ?? '', rules: space?.rules?.join('\n') ?? '', roomName: space?.room?.name ?? '', roomDescription: space?.room?.description ?? '', roomPalette: structuredClone(space?.room?.palette??null), searchSpace: space?.room?.searchSpace ?? '', background: space?.room?.background ?? '', capacity: String(space?.room?.capacity ?? 12), restoreOnOpen: String(space?.room?.restoreOnOpen !== false), presets: structuredClone(space?.presets ?? []) };
    if (space?.communityId && !this.#hosts.some(h => h.id === space.communityId)) this.#hosts.push({ id: space.communityId, name: space.communityName ?? 'Community', publicAllowed: !!space.communityPublicAllowed });
    if (draft.communityId && !this.#hosts.some(h => h.id === draft.communityId)) draft.communityId = '';
    if (draft.communityId && !this.#hosts.find(h => h.id === draft.communityId)?.publicAllowed && draft.access === 'public') draft.access = 'request';
    this.#editor = { source:space?.recoverySource??this.#source, ...(space ? { space } : {}), ...options, draft, baseline: JSON.stringify(draft), step: options.roomEntry ? 2 : 1, error: '' }; this.#paintEditor(); this.#showDialog();
  }
  #openRoomSettings(space: PersistentSpace): void {
    const current = this.#activeSpace(space);
    if (!current?.canRead || !current.canManage || current.archived || !current.room || this.#tab !== 'room' ||
        this.#loading || this.#busy || this.#dialog.open ||
        !sameSpaceSource(current.recoverySource ?? { required: false }, this.#source) || this.#resumePersonalDraft()) return;
    this.#restorePending();
    if (this.#pending) return;
    this.#edit(current, { roomEntry: true, onCancel: () => this.#focusEditTrigger(current.id, 'room', roomSettingsTrigger) });
  }
  #editRoomPresets(space: PersistentSpace): void {
    const previous=this.#editor;this.#edit(space);const editor=this.#editor;
    if(!editor||editor===previous||editor.space?.id!==space.id||editor.held)return;
    editor.step=2;editor.roomDetails=true;this.#paintEditor();
  }
  #openQuickEdit(space: PersistentSpace, quick: QuickSpaceEdit): void {
    const current = this.#activeSpace(space);
    if (!current?.canRead || !current.canManage || current.archived || this.#tab !== quickEditTriggers[quick].tab ||
        quick === 'preset' && (!current.room || (current.presets?.length ?? 0) >= roomPresetLimit) ||
        this.#loading || this.#busy || this.#dialog.open ||
        !sameSpaceSource(current.recoverySource ?? { required: false }, this.#source) || this.#resumePersonalDraft()) return;
    this.#restorePending();
    this.#edit(current, { quick, onCancel: () => this.#focusQuickEdit(current.id, quick) });
  }
  #focusQuickEdit(id: string, quick: QuickSpaceEdit): void {
    const { tab, selector } = quickEditTriggers[quick];
    this.#focusEditTrigger(id, tab, selector);
  }
  #focusEditTrigger(id: string, tab: string, selector?: string): void {
    if (!this.#valid(this.#token) || this.#selected !== id || this.#tab !== tab || this.#dialog.open) return;
    const trigger = selector ? this.#results.querySelector<HTMLButtonElement>(`${selector}:not(:disabled)`) : null;
    (trigger ?? this.#results.querySelector<HTMLButtonElement>(`${detailTablist} > button[aria-selected="true"]`))?.focus({ preventScroll: true });
  }
  #focusAfterEditRefresh(restore: () => void): () => void {
    const focusAfterClose = this.#activeElement();
    return () => {
      const active = this.#activeElement();
      if (active === focusAfterClose || !active || active === this.element.ownerDocument.body) restore();
    };
  }
  #quickEditSpace(editor: Editor, quick: QuickSpaceEdit): PersistentSpace | undefined {
    const space = editor.space;
    if (!space || this.#editor !== editor || !this.#dialog.open || this.#busy || this.#pending || editor.held) return;
    const current = this.#activeSpace(space);
    if (!current?.canRead || !current.canManage || current.archived || this.#tab !== quickEditTriggers[quick].tab || this.#loading ||
        !sameSpaceSource(current.recoverySource ?? { required: false }, editor.source)) {
      editor.error = 'The Space is unavailable for editing. Refresh it and try again.';
      this.#paintEditor();
      return;
    }
    return current;
  }
  #saveAnnouncement(editor: Editor): void {
    const current = this.#quickEditSpace(editor, 'announcement');
    if (!current) return;
    if (current.revision !== editor.space?.revision) {
      editor.conflict = current;
      editor.error = 'This Space changed. Review the latest announcement.';
      this.#paintEditor();
      return;
    }
    const announcement = editor.draft.announcement.trim().slice(0, announcementLimit);
    this.#saveQuickSettings(current, editor, 'announcement', 'Edit announcement', { announcement });
  }
  #saveQuickSettings(current: PersistentSpace, editor: Editor, quick: QuickSpaceEdit, action: string,
    changes: Partial<Pick<PersistentSpace, 'announcement' | 'room' | 'presets'>>): void {
    this.#saveSpaceSettings(current, changes, editor.source, action, () => {
      this.#editor = undefined;
      this.#close();
      return this.#focusAfterEditRefresh(() => this.#focusQuickEdit(current.id, quick));
    });
  }
  #saveSpaceSettings(current: PersistentSpace, changes: Partial<Pick<PersistentSpace, 'announcement' | 'room' | 'presets'>>,
    source: SpaceRecoverySource | undefined, action: string, done: Pending['done']): void {
    const { id, name, description, language, tags, access, discoverable, revision, rules = [], room = null, presets = [], announcement = '' } = current;
    // The settings endpoint requires the complete editable payload for this revision.
    this.#mutate('PUT', `${BASE}/${id}`, { name, description, language, tags, access, discoverable, revision, rules, room, presets, announcement, ...changes },
      done, source, `${action} · ${name}`);
  }
  #paintQuickDialog(title: string, body: HTMLElement, footer: HTMLElement, editor: Editor,
    input: HTMLInputElement | HTMLTextAreaElement, discardMessage: string): void {
    const close = iconButton('Close dialog', 'close', () => this.#requestClose());
    close.disabled = this.#busy;
    const heading = element('header', { className: 'kl-room-dialog-heading' },
      element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })), close);
    this.#dialog.setAttribute('aria-label', title);
    this.#dialog.replaceChildren(heading, body, footer);
    if (editor.discard) {
      const keep = this.#button('Keep editing', () => { editor.discard = false; warning.remove(); input.focus({ preventScroll: true }); }, undefined, undefined, true);
      const warning = element('div', { className: 'kl-sp-note-discard-area' },
        element('section', { className: 'kl-sp-note-discard', role: 'alert' }, element('strong', { text: 'Discard these changes?' }),
          element('p', { text: discardMessage }),
          element('div', { className: 'kl-sp-note-discard-actions' }, keep, this.#button('Discard changes', () => this.#requestClose(true)))));
      this.#dialog.append(warning);
      keep.focus({ preventScroll: true });
    }
  }
  #paintAnnouncement(editor: Editor): void {
    const input = element('textarea', { ariaLabel: 'A note for everyone', value: editor.draft.announcement, maxLength: announcementLimit,
      disabled: this.#busy || !!this.#pending });
    input.rows = 5;
    input.setAttribute('aria-describedby', 'kl-sp-announcement-help');
    const help = element('small', { className: 'kl-sp-field-note', text: 'Up to 400 characters. Visible to people who can access the Space.' });
    help.id = 'kl-sp-announcement-help';
    const error = element('p', { className: 'kl-sp-error', role: 'alert', text: editor.error });
    input.addEventListener('input', () => {
      if (this.#editor !== editor || input.disabled || !input.isConnected) return;
      editor.draft.announcement = input.value;
      if (!editor.conflict) editor.error = error.textContent = '';
    });
    const body = element('div', { className: 'kl-room-dialog-body kl-sp-quick-editor kl-sp-announcement-editor' },
      element('label', {}, element('span', { text: 'A note for everyone' }), input, help), error);
    const footer = element('footer', { className: 'kl-sp-actions kl-sp-quick-footer' }, this.#button('Cancel', () => this.#requestClose()));
    if (this.#pending) {
      const retry = this.#button('Retry save', () => void this.#submit());
      retry.disabled = this.#busy || !!this.#pending.intent?.held;
      footer.append(retry);
    } else if (editor.conflict) {
      const latest = editor.conflict;
      const saved = latest.announcement ?? '';
      body.append(element('div', { className: 'kl-sp-announcement-current' },
        element('strong', { text: 'Currently saved announcement' }), element('p', { text: saved || 'No announcement.' })));
      const resolve = (keep: boolean) => {
        if (this.#editor !== editor || editor.conflict !== latest) return;
        editor.space = latest;
        editor.baseline = JSON.stringify({ ...editor.draft, announcement: saved });
        if (!keep) editor.draft.announcement = saved;
        delete editor.conflict;
        editor.error = '';
        this.#paintAnnouncement(editor);
        this.#dialog.querySelector('textarea')?.focus({ preventScroll: true });
      };
      footer.append(this.#button('Use latest announcement', () => resolve(false)), this.#button('Keep my draft', () => resolve(true), undefined, undefined, true));
    } else footer.append(this.#button('Save announcement', () => this.#saveAnnouncement(editor), undefined, undefined, true));
    this.#paintQuickDialog('Edit announcement', body, footer, editor, input, 'Your unsaved announcement will be lost.');
  }
  #saveCurrentRoomPreset(editor: Editor): void {
    const current = this.#quickEditSpace(editor, 'preset');
    if (!current) return;
    const label = editor.presetName?.trim() ?? '';
    const { room, presets = [] } = current;
    if (!room || presets.length >= roomPresetLimit) {
      editor.conflict = current;
      editor.error = room ? presetLimitNotice : 'This Space no longer has a linked room.';
      this.#paintEditor();
      return;
    }
    if (current.revision !== editor.space?.revision) {
      editor.conflict = current;
      editor.error = 'This Space changed. Review the latest room settings.';
      this.#paintEditor();
      return;
    }
    if (!label || label.length > presetNameLimit) return;

    const { name, searchSpace, background, capacity, description, palette, restoreOnOpen } = room;
    const savedRoom: SpaceRoom = { name, searchSpace, background, capacity,
      ...(description !== undefined ? { description } : {}),
      ...(palette !== undefined ? { palette } : {}),
      ...(restoreOnOpen !== undefined ? { restoreOnOpen } : {}) };
    this.#saveQuickSettings(current, editor, 'preset', 'Save current room', {
      room: savedRoom,
      presets: [...presets, { id: crypto.randomUUID(), label, room: savedRoom }],
    });
  }
  #paintPresetEditor(editor: Editor): void {
    const input = element('input', { type: 'text', ariaLabel: 'Preset name', value: editor.presetName ?? '',
      maxLength: presetNameLimit, placeholder: 'An easygoing evening', disabled: this.#busy || !!this.#pending });
    input.required = true;
    input.setAttribute('aria-describedby', 'kl-sp-preset-name-help');
    const hint = element('small', { className: 'kl-sp-field-note' });
    hint.id = 'kl-sp-preset-name-help';
    const error = element('p', { className: 'kl-sp-error', role: 'alert', text: editor.error });
    const body = element('div', { className: 'kl-room-dialog-body kl-sp-quick-editor kl-sp-preset-editor' },
      element('label', {}, element('span', { text: 'Preset name' }), input, hint), error);
    const footer = element('footer', { className: 'kl-sp-actions kl-sp-quick-footer' }, this.#button('Cancel', () => this.#requestClose()));
    const snapshot = editor.conflict ?? editor.space;
    const room = snapshot?.room;
    const used = snapshot?.presets?.length ?? 0;
    if (room) body.append(element('p', { className: 'kl-sp-preset-preview' },
      element('strong', { text: room.name }), element('br'), `${room.background || 'Default'} · ${room.capacity} places`));
    body.append(element('p', { className: 'kl-sp-field-note', text:
      `Saves the name, description, background, capacity and restore setting. Live occupancy is never saved into a preset. ${used}/${roomPresetLimit} presets used.` }));

    const submit = this.#button('Save preset', () => this.#saveCurrentRoomPreset(editor), undefined, undefined, true);
    const updateName = () => {
      const length = input.value.trim().length;
      hint.textContent = !length ? 'Give this preset a name.' : length > presetNameLimit ? 'Use up to 60 characters.' : '';
      submit.disabled = input.disabled || !length || length > presetNameLimit;
    };
    updateName();
    input.addEventListener('input', () => {
      if (this.#editor !== editor || input.disabled || !input.isConnected) return;
      editor.presetName = input.value;
      if (!editor.conflict) editor.error = error.textContent = '';
      updateName();
    });
    if (this.#pending) {
      const retry = this.#button('Retry save', () => void this.#submit());
      retry.disabled = this.#busy || !!this.#pending.intent?.held;
      footer.append(retry);
    } else if (editor.conflict && room && used < roomPresetLimit) {
      const latest = editor.conflict;
      footer.append(this.#button('Review latest room', () => {
        if (this.#editor !== editor || editor.conflict !== latest) return;
        editor.space = latest;
        delete editor.conflict;
        editor.error = '';
        this.#paintPresetEditor(editor);
        this.#dialog.querySelector('input')?.focus({ preventScroll: true });
      }, undefined, undefined, true));
    } else if (!editor.conflict) footer.append(submit);
    if (editor.conflict && (!room || used >= roomPresetLimit)) {
      error.textContent = room ? presetLimitNotice : 'This Space no longer has a linked room.';
    }
    this.#paintQuickDialog('Save current room as a preset', body, footer, editor, input, 'Your unsaved preset name will be lost.');
  }
  #roomDraft(draft: Draft): SpaceRoom | null { return draft.roomName.trim() ? { name: draft.roomName.trim(), searchSpace: draft.searchSpace as SpaceRoom['searchSpace'], background: draft.background.trim(), capacity: Number(draft.capacity), ...(this.#roomOpening?{restoreOnOpen:draft.restoreOnOpen==='true'}:{}), ...(this.#roomThemes ? {description:draft.roomDescription.trim(),palette:structuredClone(draft.roomPalette??null)} : {}) } : null; }
  #draftError(d: Draft, step: number): string {
    if (step === 1) {
      if (d.name.trim().length < 3 || d.name.trim().length > 64 || !d.language.trim()) return 'Add a name of 3–64 characters and a language.';
      const tags = d.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 6 || tags.some(t => t.length > 24) || new Set(tags).size !== tags.length) return 'Use up to six different tags, with 24 characters each.';
      return '';
    }
    if (d.roomName.trim() && (!Number.isInteger(Number(d.capacity)) || Number(d.capacity) < 2 || Number(d.capacity) > (this.#roomOpening?50:20))) return this.#roomOpening?'Room capacity must be 2–50.':'Room capacity must be 2–20 until the pending Cloud update.';
    const rules = d.rules.split('\n').map(t => t.trim()).filter(Boolean);
    if (rules.length > 8 || rules.some(r => r.length > 180)) return 'Use up to eight rules, with 180 characters each.';
    return '';
  }
  #paintEditor(): void {
    const editor = this.#editor; if (!editor) return; const d = editor.draft;
    if(editor.held){const original=element('textarea',{ariaLabel:'Original Space draft'});original.readOnly=true;original.rows=10;original.value=editor.quick==='preset'?editor.presetName??'':editor.quick==='announcement'?d.announcement:JSON.stringify(d,null,2);this.#dialog.setAttribute('aria-label','Review original Space draft');this.#dialog.replaceChildren(element('h2',{text:'Review original Space draft'}),element('p',{text:editor.error}),original,this.#button('Close review',()=>{this.#close();this.#paintStatus();}),this.#button('Discard draft',()=>{editor.discard=true;this.#paintEditor();}));if(editor.discard)this.#dialog.append(element('p',{text:'Discard these unsaved details?'}),this.#button('Keep draft',()=>{editor.discard=false;this.#paintEditor();}),this.#button('Confirm discard draft',()=>{this.#editor=undefined;this.#close();void this.refresh();}));return;}
    if (editor.quick === 'announcement') { this.#paintAnnouncement(editor); return; }
    if (editor.quick === 'preset') { this.#paintPresetEditor(editor); return; }
    if (editor.space?.communityId && !this.#hosts.some(h => h.id === editor.space!.communityId)) this.#hosts.push({ id: editor.space.communityId, name: editor.space.communityName ?? 'Community', publicAllowed: !!editor.space.communityPublicAllowed });
    const form = element('form', { className: 'kl-sp-form' }); form.addEventListener('submit', e => e.preventDefault());
    const field = (key: Exclude<keyof Draft, 'presets' | 'roomPalette'>, label: string, type = 'text', max = 0, wide = false) => {
      const input = type === 'textarea' ? element('textarea', { ariaLabel: label }) : element('input', { type, ariaLabel: label });
      input.value = d[key]; if(key==='capacity'){input.setAttribute('min','2');input.setAttribute('max',this.#roomOpening?'50':'20');input.setAttribute('step','1');} input.disabled = this.#busy || !!this.#pending; if (max) input.maxLength = max;
      input.addEventListener('input', () => {if(!input.isConnected||input.disabled||this.#editor!==editor||editor.held)return; if(key==='background'&&d.background!==input.value)d.roomPalette=null; d[key] = input.value; editor.error = ''; });
      const visibleLabel = ({ description: 'About this Space', language: 'Main language', tags: 'Tags', roomName: 'Room name (optional)', capacity: 'Room capacity', rules: 'Space rules (optional)', announcement: 'Welcome note (optional)' } as Partial<Record<keyof Draft, string>>)[key] ?? label;
      const field = element('label', { className: wide ? 'wide' : '' }, element('span', { text: visibleLabel }), input);
      if (editor.step === 1) {
        if (key === 'name' || key === 'description') {
          input.placeholder = key === 'name' ? 'A little place of your own' : 'The mood, the company, and what brings you together…';
          const counter = element('small', { className: 'kl-sp-field-meta kl-sp-field-count', text: `${input.value.length}/${max}` });
          input.addEventListener('input', () => { counter.textContent = `${input.value.length}/${max}`; });
          field.append(counter);
        } else {
          if (key === 'tags') {
            input.placeholder = 'Cozy, social, creativity';
            field.append(element('small', { className: 'kl-sp-field-note', text: 'Up to six tags, separated by commas.' }));
          }
          field.append(element('span', { className: 'kl-sp-field-meta', ariaHidden: 'true' }));
        }
      } else {
        const note = key === 'roomName' ? 'Leave blank to keep this Space without a linked room.' : key === 'capacity' ? `2–${this.#roomOpening ? '50' : '20'} people, including hosts.` : key === 'rules' ? 'One rule per line. Up to 8 rules, 180 characters each.' : '';
        if (note) field.append(element('small', { className: 'kl-sp-field-note', text: note }));
        if (key === 'announcement' || key === 'rules') {
          const count = () => key === 'rules' ? `${input.value.split('\n').map(rule => rule.trim()).filter(Boolean).length}/8 rules` : `${input.value.length}/${max}`;
          const counter = element('small', { className: 'kl-sp-field-meta kl-sp-field-count', text: count() });
          input.addEventListener('input', () => { counter.textContent = count(); });
          field.append(counter);
        } else field.append(element('span', { className: 'kl-sp-field-meta', ariaHidden: 'true' }));
      }
      return field;
    };
    const select = (key: Exclude<keyof Draft, 'presets' | 'roomPalette'>, label: string, choices: Array<[string, string]>, disabled = false) => {
      const input = this.#select(label, choices, d[key], value => {if(this.#editor!==editor||editor.held||this.#pending)return; d[key] = value; if (key === 'communityId' && value && !this.#hosts.find(h => h.id === value)?.publicAllowed) d.access = 'request'; }); input.disabled = disabled || this.#busy || !!this.#pending;
      return element('label', {}, element('span', { text: label }), input);
    };
    if (editor.step === 1) {
      const association = select('communityId', 'Belongs to', [['', 'Personal space'], ...this.#hosts.map(h => [h.id, h.name] as [string, string])], !!editor.space);
      association.classList.add('wide');
      association.append(element('small', { className: 'kl-sp-field-note', text: 'Choose your profile or a community you administer. Space ownership stays separate from community ownership.' }),
        element('span', { className: 'kl-sp-field-meta', ariaHidden: 'true' }));
      form.append(field('name', 'Space name', 'text', 64, true), field('description', 'Description', 'textarea', 400, true), field('language', 'Language', 'text', 40), field('tags', 'Tags · comma separated', 'text', 150), association);
    }
    else if (editor.step === 2) {
      const access = select('access', 'Access', [...(!d.communityId || this.#hosts.find(h => h.id === d.communityId)?.publicAllowed ? [['public', 'Public'] as [string, string]] : []), ['request', 'Request only'], ['private', 'Private']]);
      access.classList.add('wide');
      access.querySelector('span')!.textContent = 'Who can join?';
      const accessNote = element('small', { className: 'kl-sp-field-note' });
      const updateAccessNote = () => { accessNote.textContent = d.access === 'public' ? 'Anyone can discover this Space and join when the room is open.' : d.access === 'request' ? 'People request access before entering the room. Your team reviews requests.' : 'An invitation or an approved member list is needed to enter.'; };
      access.querySelector('select')!.addEventListener('change', updateAccessNote);
      updateAccessNote();
      access.append(accessNote, element('span', { className: 'kl-sp-field-meta', ariaHidden: 'true' }));
      const check = (key: 'discoverable' | 'restoreOnOpen', label: string, title: string, note: string) => {
        const input = element('input', { type: 'checkbox', ariaLabel: label, disabled: this.#busy || !!this.#pending });
        input.checked = d[key] === 'true';
        input.addEventListener('change', () => { if (!input.isConnected || input.disabled || this.#editor !== editor || editor.held || this.#pending) return; d[key] = String(input.checked); editor.error = ''; });
        return element('label', { className: 'wide kl-sp-check-field' }, input, element('span', {}, element('strong', { text: title }), element('small', { text: note })));
      };
      form.append(field('roomName', 'BC room name · optional', 'text', 80), field('capacity', 'Planned room capacity', 'number'), field('background', 'Background name', 'text', 120, true), access,
        check('discoverable', 'Discovery', 'Show in Explore', 'Show the name and description. Private rooms still require access.'));
      if (this.#roomOpening) form.append(check('restoreOnOpen', 'On opening room setup', 'Restore room settings when opening', 'Remember the room name, background, capacity and access settings between sessions.'));
      form.append(field('rules', 'House rules · one per line', 'textarea', 1450, true), field('announcement', 'Welcome announcement', 'textarea', 400, true));
      const additional = element('details', { className: 'wide kl-sp-extra-settings' }, element('summary', { text: 'Additional room settings' }));
      additional.open = !!editor.roomDetails;
      additional.addEventListener('toggle', () => { if (this.#editor === editor && additional.isConnected) editor.roomDetails = additional.open; });
      const extra = element('div', { className: 'kl-sp-extra-content' }, select('searchSpace', 'BC search space', [['', 'Female'], ['X', 'Mixed'], ['M', 'Male']]));
      if(this.#roomThemes) extra.append(field('roomDescription','Room description','textarea',400,true));
      extra.append(element('div', { className: 'wide kl-sp-actions' }, this.#button('Use current BC room', () => {
        const room = this.options.currentRoom(); if (!room) { editor.error = 'Open a BC chat room first.'; this.#paintEditor(); return; }
        d.roomName = room.name; d.roomDescription=room.description??''; d.roomPalette=structuredClone(room.palette??null); d.searchSpace = room.searchSpace; d.background = room.background; d.capacity = String(room.capacity); d.restoreOnOpen=String(room.restoreOnOpen!==false); this.#paintEditor();
      }, 'location'), this.#button('Save room as preset', () => {
        const room = this.#roomDraft(d), error = this.#draftError(d, 2);
        if (!room || error || d.presets.length >= 8) { editor.error = error || (d.presets.length >= 8 ? 'Use up to eight room presets.' : 'Add a room name first.'); this.#paintEditor(); return; }
        d.presets.push({ id: crypto.randomUUID(), label: room.name.slice(0, 60), room }); this.#paintEditor();
      }, 'bookmark')));
      for (const preset of d.presets) extra.append(element('div', { className: 'wide kl-sp-preset' }, element('span', { text: `${preset.label} · ${preset.room.capacity} places` }), this.#button('Use preset', () => { d.roomName = preset.room.name; d.roomDescription=preset.room.description??''; d.roomPalette=structuredClone(preset.room.palette??null); d.searchSpace = preset.room.searchSpace; d.background = preset.room.background; d.capacity = String(preset.room.capacity); d.restoreOnOpen=String(preset.room.restoreOnOpen!==false); this.#paintEditor(); }), this.#button('Remove preset', () => { d.presets = d.presets.filter(p => p.id !== preset.id); this.#paintEditor(); })));
      extra.append(element('p', { className: 'wide kl-sp-meta', text: 'The room link and presets are shared with people who can read this space. Saving them does not create or change a BC room.' }));
      additional.append(extra);
      form.append(additional);
    } else {
      const review = element('div', { className: 'wide kl-sp-review' });
      const cover = element('div', { className: 'kl-sp-cover', ariaHidden: 'true' }, kikiIcon('location'));
      cover.dataset.tone = roomIllustrations.get(d.background.trim().toLowerCase()) ?? '0';
      if (d.roomPalette && workshopColor(d.roomPalette.primary) && workshopColor(d.roomPalette.secondary)) {
        cover.style.setProperty('--sp-wall', d.roomPalette.secondary);
        cover.style.setProperty('--sp-furniture', d.roomPalette.primary);
      }
      const host = d.communityId ? this.#hosts.find(h => h.id === d.communityId)?.name ?? 'Community' : `${this.options.name(this.#owner)}’s personal Space`;
      const tags = element('div', { className: 'kl-sp-card-tags' },
        ...[d.language, ...d.tags.split(',').map(tag => tag.trim()).filter(Boolean)].filter(Boolean)
          .map(tag => element('span', { className: 'kl-sp-badge', text: tag })));
      review.append(element('article', { className: 'kl-sp-review-card' }, cover,
        element('div', { className: 'kl-sp-review-body' },
          element('div', { className: 'kl-sp-review-heading' }, element('h3', { text: d.name.trim() }), element('span', { className: 'kl-sp-badge', text: accessLabel(d.access) })),
          element('small', { text: host }), d.description.trim() ? element('p', { text: d.description.trim() }) : undefined, tags)));
      const facts = element('dl', { className: 'kl-sp-review-details' });
      const fact = (label: string, value: string) => facts.append(element('dt', { text: label }), element('dd', { text: value }));
      fact('Room', d.roomName.trim() || 'No room linked yet');
      fact('Background', d.background.trim() || 'Not set');
      fact('Capacity', `${d.capacity} people`);
      fact('Discoverable', d.discoverable === 'true' ? 'Listed in Explore' : 'Direct link or invitation');
      if (this.#roomOpening) fact('Restore settings', d.restoreOnOpen === 'true' ? 'Yes · keep this room ready for next time' : 'No · open with a fresh room session');
      if (d.presets.length) fact('Room presets', `${d.presets.length} saved`);
      review.append(facts);
      const rules = d.rules.split('\n').map(rule => rule.trim()).filter(Boolean);
      if (rules.length) review.append(element('details', { className: 'kl-sp-review-rules' },
        element('summary', { text: `${rules.length} ${rules.length === 1 ? 'rule' : 'rules'} for this Space` }),
        element('ol', {}, ...rules.map(rule => element('li', { text: rule })))));
      if (d.announcement.trim()) review.append(element('p', { className: 'kl-sp-review-welcome' }, element('strong', { text: 'Welcome note' }), element('br'), d.announcement.trim()));
      const goTo = (step: number) => { if (this.#editor !== editor || editor.held) return; editor.step = step; editor.error = ''; this.#paintEditor(); };
      review.append(element('div', { className: 'kl-sp-review-actions' }, this.#button('Edit basics', () => goTo(1)), this.#button('Edit room & access', () => goTo(2))),
        element('p', { className: 'kl-sp-review-note', text: 'Saving this Space does not create or change a live Bondage Club room.' }));
      form.append(review);
    }
    const actions = element('footer', { className: 'kl-sp-actions' }, this.#button(editor.step === 1 ? 'Cancel' : 'Back', () => {
      if (editor.step === 1) this.#requestClose();
      else {
        editor.step--;
        editor.error = '';
        this.#paintEditor();
        if (editor.roomEntry) this.#focusEditorField();
      }
    }, editor.step === 1 ? undefined : 'back'));
    if (this.#pending) { const retry = this.#button('Retry save', () => void this.#submit()); retry.disabled = this.#busy||!!this.#pending.intent?.held; actions.append(retry); }
    else if (editor.conflict) {
      form.append(element('p', { className: 'wide', text: `Latest version: ${editor.conflict.name} · ${accessLabel(editor.conflict.access)} · ${editor.conflict.discoverable ? 'Listed' : 'Unlisted'}. Review before replacing it.` }));
      actions.append(this.#button('Use latest details', () => {
        this.#edit(editor.conflict, editor.roomEntry ? {
          roomEntry: true,
          ...(editor.onCancel ? { onCancel: editor.onCancel } : {}),
        } : undefined);
        if (editor.roomEntry) this.#focusEditorField();
      }), this.#button('Keep my draft', () => { editor.space = editor.conflict!; delete editor.conflict; editor.error = ''; editor.step = 3; this.#paintEditor(); }));
    } else actions.append(element('span', { className: 'kl-sp-step-hint', text: `Step ${editor.step} of 3` }), this.#button(editor.step === 3 ? editor.space ? 'Save changes' : 'Create space' : 'Continue', () => {
      editor.error = this.#draftError(d, editor.step === 1 ? 1 : 2); if (editor.step === 3) editor.error = this.#draftError(d, 1) || editor.error;
      if (editor.error) { this.#paintEditor(); return; }
      if (editor.step < 3) { editor.step++; this.#paintEditor(); return; }
      const body = { name: d.name.trim(), description: d.description.trim(), language: d.language.trim(), tags: d.tags.split(',').map(t => t.trim()).filter(Boolean), access: d.access, discoverable: d.discoverable === 'true', announcement: d.announcement.trim(), rules: d.rules.split('\n').map(t => t.trim()).filter(Boolean), room: this.#roomDraft(d), presets: d.presets, ...(editor.space ? { revision: editor.space.revision } : { communityId: d.communityId || null }) };
      this.#mutate(editor.space ? 'PUT' : 'POST', editor.space ? `${BASE}/${editor.space.id}` : BASE, body, receipt => {
        this.#editor = undefined;
        this.#close();
        this.#selected = receipt.spaceId;
        this.#tab = 'overview';
        if (editor.roomEntry) return this.#focusAfterEditRefresh(() => this.#focusEditTrigger(receipt.spaceId, 'overview'));
      }, editor.source, `${editor.space ? 'Save Space settings' : 'Create space'} · ${d.name.trim()}`);
    }, editor.step < 3 ? 'arrow-right' : undefined, undefined, true));
    const title = editor.space ? 'Edit space' : 'Create a space';
    const heading = element('header', { className: 'kl-room-dialog-heading' },
      element('div', {}, element('span', { className: 'kl-sp-eyebrow', text: 'KIKILINK' }), element('h2', { text: title })),
      iconButton('Close dialog', 'close', () => this.#requestClose()));
    const steps = element('ol', { className: 'kl-sp-steps', ariaLabel: 'Space editor progress' },
      ...['Basics', 'Room & access', 'Review'].map((label, index) => {
        const number = index + 1;
        const item = element('li', {}, element('span', { ariaHidden: 'true' }, number < editor.step ? kikiIcon('check') : String(number)), label);
        if (editor.step === number) item.setAttribute('aria-current', 'step');
        if (number < editor.step) item.classList.add('kl-sp-step-complete');
        return item;
      }));
    const body = element('div', { className: 'kl-room-dialog-body kl-sp-editor' }, steps,
      form, element('p', { className: 'kl-sp-error', role: 'alert', text: editor.error }));
    const keepEditing = editor.discard ? this.#button('Keep editing', () => {
      editor.discard = false;
      this.#paintEditor();
      if (editor.roomEntry) this.#focusEditorField();
    }) : undefined;
    if (keepEditing) body.append(element('p', { text: 'Discard your unsaved changes?' }), element('div', { className: 'kl-sp-actions' }, keepEditing, this.#button('Discard changes', () => this.#requestClose(true))));
    this.#dialog.replaceChildren(heading, body, actions);
    if (editor.roomEntry) keepEditing?.focus({ preventScroll: true });
  }
}
