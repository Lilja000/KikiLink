import { ContentDialog } from '../modules/link-chat/content-dialog';
import { openLocalMessageEditor } from '../modules/platform-shell/local-message-editor';
import type { GroupMessagePresentation } from './group-message-presentation';
import type {ArchiveTarget} from '../modules/link-chat/conversation-archive';
import {MediaUploadIntent,MediaGenerationError,mediaUploadError} from './media-upload-intent';
import {confirmCloudBlock} from './account-control-ui';
import type {GroupManagementActions} from './group-management-intent';
import { ThreadHistoryTimelinePanel } from '../modules/link-chat/thread-history-timeline-panel';
import { ThreadHistoryRestorePanel } from '../modules/link-chat/thread-history-restore-panel';
import { ThreadHistoryArchivePanel } from '../modules/link-chat/thread-history-archive-panel';
import { MessageAudio } from "./message-audio";
import { element } from "./dom";
import { localDay, syncDateSeparators } from "../modules/link-chat/date-separators";
import { GroupListMenu } from "./group-list-menu";
import { MessageReactions } from "./message-reactions";
import { SocialUI } from "./social-ui";
import { GroupLiveView } from "./group-live";
import { CloudError } from "./client";
import { MessageInteraction } from "../modules/link-chat/message-interaction";
import { messageActions, copyMessageText, shouldSendMessage } from "../modules/link-chat/message-controls";
import { ReplyComposer, replyPreview } from "../modules/link-chat/reply-composer";
import { parseInlineReplyContext } from "../modules/link-chat/message-reply";
import { kikiIcon } from "../modules/link-chat/icons";
import { bindClockText } from "../core/time-format";
import { messageReceiptIndicator, updateMessageReceipt } from "../modules/link-chat/message-receipt";
import { TEXT_FORMAT_HINT } from "../modules/link-chat/text-format";
import { parseMessageLinks } from "../modules/link-chat/media";
import type { CloudGroup, CloudMessage, CloudPage, CloudGroupLive } from "./types";
import { appendMentionText, shiftMentions } from './mentions';
import { MentionPicker } from './mention-picker';
import type {GroupHistoryAccess} from './group-inbox';
import {GroupMutationIntent,type GroupMutationSource} from './group-mutation-intent';
import { ShellActionMenu } from "../modules/platform-shell/action-menu";
import { composerEmojiActions } from "../modules/platform-shell/chat-composer-emoji";
import { captureHistoryReadingAnchor } from "../utils/history-reading-anchor";

export interface GroupDraft { text: string; clientId: string; mediaIds?: string[]; audioIds?: string[] }
interface GroupSubmission { text: string; clientId: string; mediaIds?: string[]; audioIds?: string[]; action:GroupMutationIntent }
interface GroupSendState {
  owner:number;origin:string;groupId:string;conversationId:string;archiveGeneration?:string|undefined;draftAction:GroupMutationIntent|undefined;actions:Map<string,GroupMutationIntent>;
  pending: GroupSubmission | undefined;
  restored: GroupSubmission | undefined;
  failed: Set<GroupSubmission>;
  revision: number;
  listeners: Set<() => void>;
  upload?: { generation?:string|undefined;intents?:WeakMap<Blob,MediaUploadIntent>; files: File[]; controller?: AbortController; progress: number; error: string };
}
// A group's draft outlives its view. Keep request ownership and retry identities
// with that draft so replacing a thread cannot start a second copy of a send.
const groupSends = new WeakMap<GroupDraft, GroupSendState>();

/** Only a never-submitted draft can be stored as an archive snapshot. */
export function groupArchiveDraft(draft:GroupDraft,target:ArchiveTarget):GroupDraft {
  const s=groupSends.get(draft);
  if(s&&(target.kind!=="group"||s.origin!==target.origin||s.groupId!==target.id||s.conversationId!==target.conversationId||(s.archiveGeneration??"legacy")!==target.generation))throw new Error("This draft belongs to an earlier group. Reopen and review it before archiving.");
  if(s&&(s.pending||s.restored||s.failed.size||s.upload?.files.length||s.draftAction?.held||[...s.actions.values()].some(a=>a.pending||a.busy||a.held)))
    throw new Error('Finish or review the pending group action before archiving. Your draft is kept.');
  return structuredClone(draft);
}

export class CloudGroupThread {
  readonly element = element("section", { className: "kl-group-thread", ariaLabel: "Group conversation" });
  readonly #localEditor = new ContentDialog();
  readonly #list = element("div", { className: "kl-group-history", role: "log", ariaLabel: "Group messages" });
  readonly #historyArchive = new ThreadHistoryArchivePanel(this.element);
  readonly #historyCopies = new ThreadHistoryRestorePanel(this.element);
  readonly #historyTimeline = new ThreadHistoryTimelinePanel(this.element);
  readonly #historyTools = element('details', { className: 'kl-group-history-tools' });
  readonly #historyTrigger = element('summary', { text: 'History', ariaLabel: 'Conversation history tools' });
  #historyFocus: HTMLElement = this.#historyTrigger;
  #conversationMenu: GroupListMenu | undefined;
  readonly #historyActions: HTMLElement[];
  #live: GroupLiveView | undefined;
  readonly #mentions: MentionPicker;
  #reactions: MessageReactions | undefined;
  #version = 0;
  #active = true;
  #olderCursor = 0;
  #lastSequence = 0;
  #count = 0;
  #seen = new Set<string>();
  #loadedMessages = new Map<string, CloudMessage>();
  #loading = false;
  #updating = false;
  readonly #sendState: GroupSendState;
  readonly #source:GroupMutationSource|undefined;
  readonly #retained=element('section',{className:'kl-group-retained-actions',ariaLabel:'Unfinished group actions',hidden:true});
  #updateAgain = false;
  #scroll: HTMLElement | null = null;
  readonly #onScroll = () => {
    if (!this.#browsingPin && this.#canRead() && this.#atBottom()) {
      this.options.readUntil?.(this.#lastSequence);
      this.#acknowledge([...this.#loadedMessages.values()], true);
      this.#new.hidden = true;
    }
  };
  readonly #more: HTMLButtonElement;
  readonly #draft: HTMLTextAreaElement;
  readonly #send: HTMLButtonElement;
  readonly #draftCount: HTMLElement;
  readonly #composeMenu: ShellActionMenu | undefined;
  readonly #failed = element("div", { className: "kl-group-pin-status", role: "status", hidden: true });
  readonly #failedPreview = element("span", { className: "kl-conversation-preview" });
  readonly #retryButton: HTMLButtonElement;
  readonly #discardButton: HTMLButtonElement;
  readonly #images = element("div", { className: "kl-group-attachments", ariaLabel: "Attached images", hidden: true });
  readonly #imageInput = element("input", { type: "file", accept: "image/jpeg,image/png,image/webp", multiple: true, hidden: true, ariaLabel: "Choose group images" });
  readonly #uploadStatus = element("span", { role: "status", className: "kl-group-upload-status" });
  readonly #attach: HTMLButtonElement;
  readonly #audio: MessageAudio;
  readonly #attachAudio: HTMLButtonElement;
  readonly #audioDraft = element("div", { className: "kl-audio-draft", hidden: true });
  readonly #cancelUpload: HTMLButtonElement;
  readonly #retryUpload: HTMLButtonElement;
  #imageSignature = "";
  #fittedDraft: string | undefined;
  #fittedWidth: number | undefined;
  #fittedThreadHeight: number | undefined;
  #composerResizeObserver: ResizeObserver | undefined;
  readonly #handleComposerResize = () => this.#fitComposer();
  readonly #archiveNotice=element("div",{className:"kl-group-pin-status kl-chat-archive-footer",role:"status",hidden:true});
  readonly #syncDraft = () => {
    this.element.hidden=!this.#identity();if(this.element.hidden)return;
    this.#sendState.draftAction?.observe(this.#source);this.#sendState.pending?.action.observe(this.#source);for(const s of this.#sendState.failed)s.action.observe(this.#source);for(const a of this.#sendState.actions.values())a.observe(this.#source);
    if (this.#reply.value !== this.draft.text) this.#reply.load(this.draft.text);
    this.#draft.readOnly=!!this.#sendState.draftAction?.held||!!this.options.archived?.();
    this.#archiveNotice.hidden=!this.options.archived?.();
    const composer=this.#draft.closest<HTMLElement>(".kl-group-composer");
    if(composer) { composer.inert=!!this.options.archived?.(); composer.hidden=composer.inert; }
    this.#fitComposer();
    this.#draftCount.textContent = `${this.draft.text.length} / 4000`;
    if (this.options.platformPreview) this.#draftCount.hidden = this.draft.text.length < 3600;
    this.#send.disabled = !this.#canMutate()||this.#draft.readOnly||(!this.#reply.hasContent && !this.draft.mediaIds?.length && !this.draft.audioIds?.length) || Boolean(this.#sendState.pending || this.#sendState.upload?.files.length);
    this.#syncImages();
    this.#syncAudio();
    const first = this.#sendState.failed.values().next().value;
    if (first) {
      if (!this.#failed.firstChild) this.#failed.append(element("div", { className: "kl-composer-options" }, this.#failedPreview, this.#retryButton, this.#discardButton));
      const count = this.#sendState.failed.size;
      this.#failedPreview.textContent = `${count > 1 ? `${count} messages` : "Message"} not confirmed: ${first.text.replace(/\s+/gu, " ").slice(0, 120)}${first.audioIds?.length ? " · MP3" : ""}${first.mediaIds?.length ? ` · ${first.mediaIds.length} image(s)` : ""}`;
      this.#failedPreview.title = first.text;
    } else this.#failed.replaceChildren();
    this.#retryButton.disabled = this.#discardButton.disabled = Boolean(this.#sendState.pending);
    this.#retryButton.disabled ||= !!first?.action.held||!this.#canMutate();
    this.#failed.hidden = !first||!!first.action.source;
    this.#renderRetained();
  };
  readonly #new: HTMLButtonElement;
  readonly #controls: MessageInteraction;
  readonly #reply: ReplyComposer;
  #replyMessageId: string | undefined;
  readonly #messages = new WeakMap<HTMLElement, CloudMessage>();
  readonly #pin = element("button", { type: "button", className: "kl-group-pin-bar", hidden: true });
  readonly #pinRemove = element("button", { type: "button", className: "kl-social-icon-button kl-group-pin-remove", ariaLabel: "Unpin message", title: "Unpin message", hidden: true }, kikiIcon("close"));
  readonly #pinRow = element("div", { className: "kl-group-pin-row", hidden: true }, this.#pin, this.#pinRemove);
  readonly #pinStatus = element("p", { className: "kl-group-pin-status", role: "status", hidden: true });
  #browsingPin = false;
  #messageTarget: string | undefined;
  #pinBusy = false;
  #pinProfile: number | undefined;
  #highlight: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly ui: SocialUI, readonly group: CloudGroup,
    readonly draft: GroupDraft,
    readonly options: { presentation?: GroupMessagePresentation; persistLocalChanges?(): boolean; localChanged?(): void; platformPreview?: boolean; archived?():boolean; restoreArchive?():void; beforeDraftChange?():void; enterToSend(): boolean; history?:GroupHistoryAccess; management?:GroupManagementActions; mentions?: boolean; messageChanges?: boolean; groupLive?: boolean; groupPins?: boolean; messageReceipts?: boolean; groupMessageMedia?: boolean; messageAudio?: boolean; messageReactions?: boolean; chatReactionChoices?: boolean; liveChanged?(live: CloudGroupLive): void; membershipChanged(): Promise<void>; report(row: HTMLElement, id: string): void;
      observed?(messages: CloudMessage[], read: boolean): void; acknowledgeReceipts?(deliveredIds: string[], readIds: string[]): void; draftChanged?(text: string): void; canRead?(): boolean; readUntil?(sequence: number): void; messageTargetChanged?(id: string | undefined): void }) {
    let sendState = groupSends.get(draft);
    if (!sendState) { sendState = { owner:ui.options.client.memberNumber,origin:ui.options.client.origin,groupId:group.id,conversationId:group.conversationId,archiveGeneration:options.history?.generation,draftAction:undefined,actions:new Map(),pending: undefined, restored: undefined, failed: new Set(), revision: 0, listeners: new Set() }; groupSends.set(draft, sendState); }
    this.#sendState = sendState;
    this.#source=options.history?(options.history.mutationSource??{generation:options.history.generation,required:false}):undefined;
    sendState.draftAction?.observe(this.#source);for(const s of sendState.failed)s.action.observe(this.#source);for(const a of sendState.actions.values())a.observe(this.#source);
    if(this.#identity()&&(draft.text||draft.mediaIds?.length||draft.audioIds?.length))this.#sendState.draftAction??=this.#makeAction('send',`/v1/conversations/${group.conversationId}/messages`);
    if (options.groupLive) this.#live = new GroupLiveView(ui, group, live => options.liveChanged?.(live));
    this.#list.setAttribute("aria-live", "polite");
    this.#more = ui.button("Load earlier messages", () => this.loadOlder(), "previous", "kl-social-button kl-group-load");
    this.#draft = element("textarea", { className: "kl-group-input", value: draft.text, maxLength: 4000, ariaLabel: options.platformPreview ? `Message ${group.title}` : "Message this Cloud group", placeholder: `Message ${group.title}…` });
    this.#mentions = new MentionPicker(ui.options.client, member => ui.options.isBlocked(member));
    this.#mentions.bind(this.#draft, () => options.mentions && this.#active ? {
      key: group.id, members: group.members.filter(m => m.status === 'active').map(m => m.memberNumber),
    } : undefined);
    if (!options.platformPreview) this.#draft.title = TEXT_FORMAT_HINT;
    this.#reply = new ReplyComposer(this.#draft, 4000, options.platformPreview ? {
      beforeChange: () => this.#captureHistoryPosition(),
    } : undefined);
    this.#draftCount = element("span", { className: "kl-composer-count", text: `${draft.text.length} / 4000` });
    this.#draft.addEventListener("input", () => {
      if(!this.#active||!this.#identity()||!this.#draft.isConnected||this.#draft.readOnly){this.#syncDraft();return;}
      try{this.options.beforeDraftChange?.();}catch(e){this.#reply.load(draft.text);this.#uploadStatus.textContent=e instanceof Error?e.message:"The saved draft could not be updated.";return;}
      if (draft.text !== this.#reply.value) {
        // Editing a restored, unconfirmed message makes a new draft. Its original
        // text and id remain available for an explicit, idempotent retry.
        this.#forkRestored();
        this.#draftAction();
        draft.text = this.#reply.value; this.#sendState.revision++;
      }
      this.#live?.signal(this.#reply.hasContent); this.#notifyDraft(true);
    });
    this.#draft.addEventListener("blur", () => this.#live?.signal(false));
    this.#send = ui.button("Send", () => this.send(), "send", "kl-social-button kl-social-primary", false);
    this.#attach = ui.button(options.platformPreview ? "Attach images" : "Add image", () => {if(this.#editable() && options.groupMessageMedia)this.#imageInput.click();}, "image", "kl-social-icon-button", false);
    this.#attach.hidden = !options.platformPreview && !options.groupMessageMedia;
    if (options.platformPreview && !options.groupMessageMedia) this.#attach.title = "Image attachments are unavailable in this Cloud session";
    this.#audio = new MessageAudio(ui.options.client, this.element);
    this.#attachAudio = ui.button("Attach MP3", () => {
      if (!this.#editable() || !options.messageAudio || this.#sendState.pending || this.draft.audioIds?.length) return;
      this.#forkRestored();const action=this.#draftAction();
      this.#audio.open(group.title, id => {
        if (!this.#editable() || this.#sendState.draftAction!==action || this.#sendState.pending || this.draft.audioIds?.length) throw new Error("Draft unavailable");
        this.#forkRestored();this.#draftAction();this.draft.audioIds = [id]; this.#sendState.revision++; this.#notifyDraft(true);
      },false,this.#source?.generation);
    }, "music", "kl-social-icon-button", false);
    this.#attachAudio.hidden = !options.messageAudio;
    let composeTools: HTMLButtonElement | undefined;
    if (options.platformPreview) {
      this.element.setAttribute("aria-label", `Conversation with ${group.title}`);
      this.element.classList.add("kl-group-thread-preview");
      this.#list.tabIndex = 0;
      this.#list.setAttribute("aria-label", "Message history");
      this.#draft.rows = 1;
      requestAnimationFrame(() => this.#fitComposer());
      this.#composeMenu = new ShellActionMenu();
      this.#composeMenu.element.id = "kl-group-compose-menu";
      const tools = ui.button("Emoji and attachments", () => this.#openComposeTools(tools), "emoji", "kl-social-icon-button kl-group-compose-tools", false);
      tools.setAttribute("aria-haspopup", "menu");
      tools.setAttribute("aria-expanded", "false");
      composeTools = tools;
      this.#send.classList.add("kl-group-send-icon");
    }
    this.#cancelUpload = ui.button("Cancel upload", () => {
      if(!this.#active||!this.#identity()||!this.#cancelUpload.isConnected)return;
      const upload = this.#sendState.upload;
      if (upload?.controller) upload.controller.abort();
      else if (upload) { upload.files = []; upload.error = ""; this.#notifyDraft(); }
    }, "close", "kl-social-button", false);
    this.#retryUpload = ui.button("Retry upload", () => this.#uploadImages(), "refresh", "kl-social-button", false);
    this.#imageInput.addEventListener("change", () => {
      const files = [...(this.#imageInput.files ?? [])]; this.#imageInput.value = "";
      if (!files.length || !this.#editable() || !this.#imageInput.isConnected || !options.groupMessageMedia || this.#sendState.pending || this.#sendState.upload?.files.length) return;
      if (files.length + (this.draft.mediaIds?.length ?? 0) > 4 || files.some(file => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 ** 2)) {
        this.#sendState.upload = { files: [], progress: 0, error: "Choose up to 4 PNG, JPEG or WebP images, up to 5 MiB each." }; this.#notifyDraft(); return;
      }
      try{this.options.beforeDraftChange?.();}catch(e){this.#uploadStatus.textContent=e instanceof Error?e.message:"The saved draft could not be updated.";return;}
      this.#forkRestored();this.#draftAction();
      this.#sendState.upload = { files, generation:this.#source?.generation, progress: 0, error: "" };
      void this.#uploadImages();
    });
    this.#send.disabled = !this.#reply.hasContent;
    this.#retryButton = ui.button("Retry", () => {
      const first = this.#sendState.failed.values().next().value;
      if (first) return this.#retry(first);
    }, "refresh", "kl-social-button", false);
    this.#discardButton = ui.button("Stop retrying", () => this.#discardFailed(), "close", "kl-social-icon-button", false);
    this.#discardButton.title = "Stops local retries. A message already accepted by the server may still arrive.";
    this.#draft.addEventListener("keydown", event => {
      if (shouldSendMessage(event, options.enterToSend())) {
        event.preventDefault(); if (!this.#send.disabled) this.#send.click();
      }
    });
    this.#new = ui.button("New messages", () => this.#browsingPin ? this.#latest() : this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest", behavior: "smooth" }), "unread", "kl-social-button kl-group-new");
    this.#new.hidden = true;
    this.#list.prepend(this.#more);
    this.#pin.addEventListener("click", () => { void this.ui.options.run(() => this.#jumpToPin()); });

    this.#renderPin();
    const closeHistoryMenu = () => {
      this.#historyTools.open = false;
      this.#conversationMenu?.close();
    };
    const saveHistory = ui.button("Save history ZIP", () => {
      if (!this.#active || !ui.options.client.connected) return;
      closeHistoryMenu();
      this.#historyCopies.close(); this.#historyTimeline.close(); this.#mentions.close(); this.#audio.pause(); this.#controls.close();
      this.#historyArchive.open(ui.options.client,{kind:'group',containerId:group.id,id:group.conversationId,label:group.title},()=>this.#active&&this.element.isConnected,this.#historyFocus);
    }, options.platformPreview ? "archive" : undefined, "kl-text-button", false);
    const restoredHistory = ui.button("Restore history ZIP", () => {
      if (!this.#active) return;
      closeHistoryMenu(); this.#historyTimeline.close(); this.#historyArchive.close(); this.#mentions.close(); this.#audio.pause(); this.#controls.close();
      this.#historyCopies.open(ui.options.client,{kind:'group',containerId:group.id,id:group.conversationId,label:group.title},()=>this.#active&&this.element.isConnected,this.#historyFocus,n=>ui.options.isBlocked(n));
    }, options.platformPreview ? "refresh" : undefined, "kl-text-button", false);
    const combinedHistory = ui.button("Show combined history", () => {
      if (!this.#active || !ui.options.client.connected) return;
      closeHistoryMenu(); this.#historyArchive.close(); this.#historyCopies.close(); this.#mentions.close(); this.#audio.pause(); this.#controls.close();
      this.#historyTimeline.open(this.element,{client:ui.options.client,scope:{kind:'group',containerId:group.id,id:group.conversationId,label:group.title},current:()=>this.#active&&this.element.isConnected,live:()=>[...this.#loadedMessages.values()].flatMap(message=>this.#project(message)??[]),hiddenIds:()=>[...this.#seen],blocked:n=>ui.options.isBlocked(n),focus:this.#historyFocus});
    }, options.platformPreview ? "history" : undefined, "kl-text-button", false);
    this.#historyActions = [saveHistory, restoredHistory, combinedHistory];
    this.#historyTools.append(this.#historyTrigger, element('div', { className: 'kl-group-history-actions' }, ...this.#historyActions));
    this.#historyTools.addEventListener('keydown', event => {
      if(event.key !== 'Escape' || !this.#historyTools.open) return;
      event.preventDefault(); event.stopPropagation(); this.#historyTools.open=false; this.#historyTrigger.focus();
    });
    this.#historyTools.addEventListener('focusout', event => {
      if(event.relatedTarget instanceof Node && !this.#historyTools.contains(event.relatedTarget)) this.#historyTools.open=false;
    });
    this.element.append(this.#historyTools,this.#pinRow, this.#pinStatus, this.#list, this.#new, this.#failed, this.#retained, ...(this.#live ? [this.#live.element] : []),
      element("div", { className: "kl-group-composer" }, this.#reply.element, this.#images, this.#audioDraft,
        element("div", { className: "kl-group-compose-main" }, this.#attach, ...(composeTools ? [this.#draft, composeTools] : [this.#attachAudio, this.#draft]), this.#send),
        element("div", { className: "kl-group-upload" }, this.#imageInput, this.#uploadStatus, this.#retryUpload, this.#cancelUpload),
        element("div", { className: "kl-group-compose-actions" },
          ...(options.platformPreview ? [] : [element("small", { text: "Shift + Enter for a new line" })]), this.#draftCount)));
    if (this.#composeMenu) this.element.append(this.#composeMenu.element);
    if (options.messageReactions) this.#reactions = new MessageReactions(ui.options.client, this.#list, { base: `/v1/conversations/${group.conversationId}`, kind: "group", platformChat: options.platformPreview === true, choices: () => !!options.chatReactionChoices, isBlocked: member => ui.options.isBlocked(member) || !!ui.options.client.isProfileBlocked?.(member), canReact: () => this.#canMutate(), enabled: () => !!options.messageReactions && this.#active && this.#identity() && (this.options.history?.current() ?? true), ...(this.#source?{group:{groupId:group.id,conversationId:group.conversationId,label:group.title,source:this.#source,actions:this.#sendState.actions,changed:()=>this.#notifyDraft()}}:{}) });
    this.#archiveNotice.append(element("span",{text:options.platformPreview ? "This conversation is archived." : "This conversation is archived. Your draft is kept."}),ui.button("Restore conversation",()=>this.options.restoreArchive?.(),"archive"));
    this.#draft.closest(".kl-group-composer")?.before(this.#archiveNotice);
    if(!this.#archiveNotice.isConnected&&!this.element.contains(this.#archiveNotice))this.element.append(this.#archiveNotice);
    this.#controls = new MessageInteraction(this.element, this.#list, row => this.#contextActions(row), options.platformPreview === true);
    this.#sendState.listeners.add(this.#syncDraft); this.#syncDraft();
    if (options.platformPreview) {
      if (typeof ResizeObserver === "function") {
        this.#composerResizeObserver = new ResizeObserver(this.#handleComposerResize);
        this.#composerResizeObserver.observe(this.element);
      }
      window.addEventListener("resize", this.#handleComposerResize);
    }
  }
  conversationOptions(actions: (id: string, close: () => void, anchor: HTMLElement) => HTMLElement[], historyHost: HTMLElement): HTMLButtonElement {
    const menu = new GroupListMenu(this.element, (id, anchor) => actions(id, () => menu.close(), anchor), true);
    historyHost.append(...this.#historyActions);
    const scope = element("div", { ariaLabel: this.group.title });
    scope.dataset.groupId = this.group.id;
    const trigger = this.ui.button("Conversation options", () => menu.open(scope, trigger), "more", "kl-social-icon-button", false);
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    this.#conversationMenu = menu;
    this.#historyFocus = trigger;
    this.#historyTools.remove();
    this.element.append(menu.element);
    return trigger;
  }
  #fitComposer(): void {
    if (!this.options.platformPreview || !this.#active || !this.#draft.isConnected || this.#draft.closest("[hidden]")) return;
    const width = this.#draft.clientWidth, height = this.element.clientHeight;
    if (width <= 0 || (this.#fittedDraft === this.#draft.value && this.#fittedWidth === width && this.#fittedThreadHeight === height)) return;
    const followTail = !this.#browsingPin && this.#list.scrollHeight - this.#list.scrollTop - this.#list.clientHeight <= 1;
    this.#fittedDraft = this.#draft.value;
    this.#fittedWidth = width;
    this.#fittedThreadHeight = height;
    this.#draft.style.height = "auto";
    this.#draft.style.height = `${Math.max(36, this.#draft.scrollHeight)}px`;
    if (followTail) this.#list.scrollTop = this.#list.scrollHeight;
  }
  #captureHistoryPosition(): (() => void) | undefined {
    const current = () => this.#active && this.ui.options.client.connected && this.#identity() && !this.#browsingPin &&
      (this.options.history?.current() ?? true) && this.#list.isConnected && !this.element.closest("[hidden]");
    if (!current()) return;
    const followTail = this.#list.scrollHeight - this.#list.scrollTop - this.#list.clientHeight <= 1;
    // A fixed scrollTop alone moves the reader's text when an image above it grows.
    const restoreAnchor = followTail ? undefined : captureHistoryReadingAnchor(this.#list, ".kl-group-message-text", ".kl-group-message-images,button");
    if (!followTail && !restoreAnchor) return;
    const version = this.#version;
    return () => {
      if (version !== this.#version || !current()) return;
      if (followTail) this.#list.scrollTop = this.#list.scrollHeight;
      else restoreAnchor?.();
    };
  }
  #identity():boolean {
    const s=this.#sendState,c=this.ui.options.client;
    return s.owner===c.memberNumber&&s.origin===c.origin&&s.groupId===this.group.id&&s.conversationId===this.group.conversationId;
  }
  archiveChanged():void {this.#live?.signal(false);this.#syncDraft();}
  #canMutate():boolean{return this.#active&&this.#identity()&&!this.options.archived?.()&&(this.options.history?.current()??true);}
  #editable():boolean{return this.#canMutate()&&!this.#sendState.draftAction?.held;}
  #openComposeTools(anchor: HTMLButtonElement): void {
    if (!this.#editable()) return;
    const draft = this.#draft;
    const { selectionStart, selectionEnd } = draft;
    const actions = composerEmojiActions(emoji => {
      if (!this.#editable() || !draft.isConnected) return;
      if (draft.value.length - (selectionEnd - selectionStart) + emoji.length > draft.maxLength) {
        this.#uploadStatus.textContent = "This emoji would exceed the message limit.";
        return;
      }
      draft.setRangeText(emoji, selectionStart, selectionEnd, "end");
      draft.dispatchEvent(new Event("input", { bubbles: true }));
      draft.focus({ preventScroll: true });
    });
    if (!this.#attachAudio.hidden && !this.#attachAudio.disabled) actions.push({
      label: "Attach MP3", icon: "music", separator: true, run: () => this.#attachAudio.click(),
    });
    this.#composeMenu?.open(anchor, "Emoji and attachments", actions, undefined, true);
  }
  #makeAction(kind:'send'|'delete'|'reaction',path:string,messageId?:string,preview?:string):GroupMutationIntent {
    return new GroupMutationIntent(this.ui.options.client,{kind,path,groupId:this.group.id,conversationId:this.group.conversationId,membershipVersion:this.group.membershipVersion,keyVersion:this.group.keyVersion,label:this.group.title,...messageId?{messageId}:{},...preview!==undefined?{preview}:{}},this.#source);
  }
  #draftAction():GroupMutationIntent{this.options.beforeDraftChange?.();return this.#sendState.draftAction??=this.#makeAction('send',`/v1/conversations/${this.group.conversationId}/messages`);}
  async #runAction(action:GroupMutationIntent):Promise<void> {
    if(!this.#canMutate()||action.held||action.busy)return;
    const version=this.#version;this.#notifyDraft();
    try{
      const result=await action.send(action.pending??{},()=>version===this.#version&&this.#canMutate()&&this.element.isConnected);
      if(action.source&&!result)return;
      this.#sendState.actions.delete(action.target.path);
      if(version===this.#version&&this.#canMutate()){
        if(action.target.kind==='delete'){
          const row=[...this.#list.querySelectorAll<HTMLElement>('[data-message-id]')].find(row=>row.dataset.messageId===action.target.messageId);
          if(row)this.#removeMessage(row);
        }else await this.#reactions?.refresh();
      }
    }finally{this.#notifyDraft();}
  }
  #renderRetained():void {
    const state=this.#sendState,entries=new Set<GroupMutationIntent>([...state.failed].map(s=>s.action));
    for(const a of state.actions.values())entries.add(a);
    if(state.draftAction?.held)entries.add(state.draftAction);
    const actions=[...entries].filter(a=>a.source&&a.identity());
    this.#retained.hidden=!actions.length;
    this.#retained.replaceChildren();if(!actions.length)return;
    this.#retained.append(element('h4',{text:'Unfinished group actions'}));
    for(const action of actions){
      const data=action.pending,submission=[...state.failed].find(s=>s.action===action),isDraft=state.draftAction===action;
      const text=typeof data?.text==='string'?data.text:action.target.preview??(isDraft?this.draft.text:'');
      const detail=element('details',{},element('summary',{text:`${action.target.label??'Group'} · ${action.target.kind}`}));
      detail.append(element('p',{text:action.notice||'This request is not confirmed. Its original details are kept.'}),element('p',{text:`Group: ${action.target.groupId}${action.target.messageId?` · Message: ${action.target.messageId}`:''}`}));
      if(text){const copy=element('textarea',{value:text,ariaLabel:'Original group action text'});copy.rows=3;copy.readOnly=true;detail.append(copy);}
      const media=data?.mediaIds??(isDraft?this.draft.mediaIds:[]),audio=data?.audioIds??(isDraft?this.draft.audioIds:[]);
      if(Array.isArray(media)&&media.length||Array.isArray(audio)&&audio.length)detail.append(element('p',{text:`Attachment IDs: ${[...Array.isArray(media)?media:[],...Array.isArray(audio)?audio:[]].join(', ')}`}));
      if(action.target.kind==='reaction')detail.append(element('p',{text:`Original reaction: ${data?.reaction??'Remove reaction'}`}));
      if(!action.held){
        const retry=this.ui.button('Retry original group action',async()=>{if(!retry.isConnected||retry.disabled)return;if(submission)await this.#retry(submission);else await this.#runAction(action);},'refresh','kl-social-button',false);
        retry.disabled=action.busy||!!state.pending||!this.#canMutate();detail.append(retry);
      }
      const discard=this.ui.button(isDraft?'Discard group draft':'Discard group action',()=>{
        if(!discard.isConnected||discard.disabled||!this.#active||!this.#identity())return;
        this.ui.confirm(detail,'Discard these local details? This does not undo a request that the server may already have accepted. Copy anything you want to keep first.',async()=>{
          if(!detail.isConnected||!this.#active||!this.#identity()||action.busy||state.pending)return;
          if(submission)state.failed.delete(submission);state.actions.delete(action.target.path);
          if(state.draftAction===action){this.draft.text='';if(this.draft.mediaIds)this.draft.mediaIds=[];if(this.draft.audioIds)this.draft.audioIds=[];this.draft.clientId=crypto.randomUUID();state.draftAction=undefined;state.restored=undefined;state.upload?.controller?.abort();delete state.upload;state.revision++;}
          this.#notifyDraft(true);await this.#reactions?.refresh();
        },'Discard');
      },'close','kl-social-button',false);
      discard.disabled=action.busy||!!state.pending;detail.append(discard);this.#retained.append(detail);
    }
  }
  pause(): void { this.#localEditor.close(); this.#composeMenu?.close(false); this.#conversationMenu?.close(false); this.#historyTools.open=false; this.#historyArchive.close(); this.#historyCopies.close(); this.#historyTimeline.close(); this.#mentions.close(); this.#audio.pause(); this.#reactions?.pause(); this.#version++; this.#active = false; this.#sendState.upload?.controller?.abort(); this.#live?.pause(); this.#controls.close(); clearTimeout(this.#highlight); }
  resume(): void { this.#active = true; this.#reactions?.resume(); this.#syncDraft(); this.#live?.resume(); this.#onScroll(); }
  stop(): void { this.pause(); this.#localEditor.destroy(); this.#composerResizeObserver?.disconnect(); this.#composerResizeObserver = undefined; window.removeEventListener("resize", this.#handleComposerResize); this.#composeMenu?.destroy(); this.#conversationMenu?.destroy(); this.#mentions.destroy(); this.#audio.destroy(); this.#reactions?.destroy(); this.#sendState.listeners.delete(this.#syncDraft); this.#controls.destroy(); this.#reply.destroy(); this.#live?.destroy(); this.#scroll?.removeEventListener("scroll", this.#onScroll); this.#scroll = null; }
  #notifyDraft(changed = false): void {
    // Rendering is an observer of committed draft state. A broken view/preview
    // must not cancel a submission, strand its pending flag or hide its outcome.
    for (const listener of this.#sendState.listeners) {
      try { listener(); }
      catch (error) { console.error("[KikiLink:cloud-group] Draft view failed", error); }
    }
    if (changed) {
      try { this.options.draftChanged?.(this.draft.text || (this.draft.audioIds?.length ? "Audio" : this.draft.mediaIds?.length ? "Image" : "")); }
      catch (error) { console.error("[KikiLink:cloud-group] Draft observer failed", error); }
    }
  }
  #editImages(ids: string[]): void {
    if(!this.#editable())return;
    const reserved = this.#forkRestored();
    this.#draftAction();
    ids = ids.filter(id => !reserved.includes(id));
    this.draft.mediaIds = ids; this.#sendState.revision++; this.#notifyDraft(true);
  }
  #forkRestored(): string[] {
    const restored = this.#sendState.restored;
    if (!restored) return [];
    // An unconfirmed attachment may already belong to the original message.
    // Keep it with that retry, never attach it to a second message identity.
    const reserved = [...(restored.mediaIds ?? []), ...(restored.audioIds ?? [])];
    if (restored.audioIds?.length) this.draft.audioIds = (this.draft.audioIds ?? []).filter(id => !reserved.includes(id));
    if (reserved.length) this.draft.mediaIds = (this.draft.mediaIds ?? []).filter(id => !reserved.includes(id));
    this.#sendState.restored = undefined; this.#sendState.draftAction=undefined;this.draft.clientId = crypto.randomUUID();
    return reserved;
  }
  #syncAudio(): void {
    this.#audioDraft.hidden = !this.draft.audioIds?.length;
    this.#attachAudio.disabled = !this.#editable()||!!this.#sendState.pending || !!this.draft.audioIds?.length;
    if (this.draft.audioIds?.length && !this.#audioDraft.firstChild) this.#audioDraft.append(
      element("span", { text: "MP3 attached" }), this.ui.button("Remove audio", () => {
        if (!this.#editable()||this.#sendState.pending) return;
        this.#forkRestored();this.#draftAction();this.draft.audioIds = []; this.#sendState.revision++; this.#notifyDraft(true);
      }, "close", "kl-social-icon-button", false));
    for (const b of this.#audioDraft.querySelectorAll("button")) b.disabled = !this.#editable()||!!this.#sendState.pending;
  }
  #syncImages(): void {
    const ids = this.draft.mediaIds ?? [], upload = this.#sendState.upload;
    const signature = ids.join(",");
    if (signature !== this.#imageSignature) {
      this.#imageSignature = signature;
      this.#images.replaceChildren(...ids.map(id => element("div", { className: "kl-group-attachment" },
        this.ui.options.image(id, "Attached image", "kl-cloud-image"),
        this.ui.button("Remove image", () => { if (!this.#sendState.pending && !this.#sendState.upload?.controller) this.#editImages((this.draft.mediaIds ?? []).filter(value => value !== id)); }, "close", "kl-social-icon-button", false))));
    }
    this.#images.hidden = !ids.length;
    const busy = !this.#editable()||Boolean(this.#sendState.pending || upload?.controller);
    for (const button of this.#images.querySelectorAll<HTMLButtonElement>("button")) button.disabled = busy;
    this.#attach.disabled = !this.options.groupMessageMedia || busy || ids.length >= 4 || Boolean(upload?.files.length);
    this.#cancelUpload.hidden = !upload?.files.length;
    this.#retryUpload.hidden = !upload?.files.length || Boolean(upload.controller);
    this.#retryUpload.disabled=!this.#editable();
    this.#uploadStatus.textContent = upload?.controller ? `Uploading image · ${upload.progress}%` : upload?.error ?? "";
  }
  async #uploadImages(): Promise<void> {
    const upload = this.#sendState.upload;
    if (!this.#editable() || !this.options.groupMessageMedia || !upload?.files.length || upload.controller || this.#sendState.pending) return;
    const action=this.#draftAction();
    const controller = new AbortController(); upload.controller = controller; upload.error = "";
    this.#notifyDraft();
    try {
      while (upload.files.length) {
        upload.progress = 0; this.#notifyDraft();
        const file=upload.files[0]!,intents=upload.intents??=new WeakMap();let intent=intents.get(file);
        if(!intent){intent=new MediaUploadIntent(this.ui.options.client,file,upload.generation);intents.set(file,intent);}
        const current=()=>!controller.signal.aborted&&this.#editable()&&this.#sendState.draftAction===action&&this.#sendState.upload===upload;
        const image=await intent.send(current,{signal:controller.signal,onProgress:percent=>{if(current()){upload.progress=percent;this.#notifyDraft();}}});
        if (controller.signal.aborted||!this.#editable()||this.#sendState.draftAction!==action) break;
        upload.files.shift();
        this.#editImages([...new Set([...(this.draft.mediaIds ?? []), image.id])]);
      }
    } catch (error) {
      error=mediaUploadError(error);upload.error = error instanceof MediaGenerationError?error.message:error instanceof CloudError && ["storage_quota", "storage_capacity"].includes(error.code)
        ? "Storage is full. Remove unused images or try later."
        : "Image upload was not confirmed. Retry or cancel.";
    } finally {
      if (controller.signal.aborted) upload.error = "Upload cancelled. Retry to continue, or cancel to discard the selection.";
      delete upload.controller; this.#notifyDraft();
    }
  }
  #historyRequest<T>(method:string,path:string,body?:unknown):Promise<T> {
    return this.options.history?this.options.history.request<T>(method,path,body):this.ui.options.client.request<T>(method,path,body);
  }
  isReading(): boolean { return !this.#browsingPin && this.#canRead() && this.#atBottom(); }
  #canRead(): boolean { return this.#active && (this.options.history?.current()??true) && !this.#historyArchive.active && !this.#historyCopies.active && !this.#historyTimeline.active && document.visibilityState !== "hidden" && (this.options.canRead?.() ?? true); }
  #atBottom(): boolean { return !this.#scroll || this.#scroll.scrollHeight - this.#scroll.scrollTop - this.#scroll.clientHeight < 180; }
  async loadOlder(): Promise<void> {
    if (this.#loading || !this.#active) return;
    const version = this.#version; this.#loading = true;
    try {
      const page = await this.#historyRequest<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=${this.#olderCursor}`);
      if (version !== this.#version) return;
      const fragment = document.createDocumentFragment();
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender) || this.#seen.has(message.id)) continue;
        this.#seen.add(message.id); this.#loadedMessages.set(message.id, message); fragment.append(this.#row(message)); this.#count++;
      }
      const anchor = this.#list.querySelector<HTMLElement>("[data-message-id]");
      const top = anchor?.getBoundingClientRect().top;
      this.#more.after(fragment); this.#syncMessageLayout(); this.#olderCursor = page.nextCursor ?? 0;
      const scroll = this.#list;
      if (!this.#scroll && scroll) { this.#scroll = scroll; scroll.addEventListener("scroll", this.#onScroll, { passive: true }); }
      if (anchor && top !== undefined && scroll) scroll.scrollTop += anchor.getBoundingClientRect().top - top;
      this.#more.hidden = page.nextCursor === null || this.#count >= 200;
      if (!this.#count) this.#list.append(element("p", { className: "kl-group-empty", text: this.options.platformPreview ? "Start with a hello" : "Say hello. This is the start of your conversation." }));
      if (!anchor) { this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" }); this.#live?.resume(); }
      const read = !this.#browsingPin && this.#canRead() && (!anchor || this.#atBottom());
      this.options.observed?.(page.items, read);
      this.#acknowledge(page.items, read); this.#historyTimeline.sync();
    } finally { this.#loading = false; }
  }
  async updates(): Promise<void> {
    if (!this.#active) return;
    if (this.#updating) { this.#updateAgain = true; return; }
    const version = this.#version; this.#updating = true;
    try {
      let fresh: CloudGroup;
      try { fresh = await this.#historyRequest<CloudGroup>("GET", `/v1/groups/${this.group.id}`); }
      catch (error) { if (error instanceof CloudError && error.status === 404 && version === this.#version) { await this.options.membershipChanged(); return; } throw error; }
      if (version !== this.#version) return;
      this.group.pinnedMessage = fresh.pinnedMessage ?? null; this.group.pinRevision = fresh.pinRevision ?? 0; this.#renderPin();
      if (fresh.membershipVersion !== this.group.membershipVersion || fresh.revision !== this.group.revision) { await this.options.membershipChanged(); return; }
      if (this.#loading) return;
      if (this.#browsingPin) {
        if (this.#messageTarget) {
          try {
            const message = await this.#historyRequest<CloudMessage>("GET", `/v1/conversations/${this.group.conversationId}/messages/${encodeURIComponent(this.#messageTarget)}`);
            if (version !== this.#version) return;
            if (message.text === null || !this.#project(message) || this.ui.options.isBlocked(message.sender)) this.#messageUnavailable();
          } catch (error) {
            if (version === this.#version && error instanceof CloudError && [403, 404].includes(error.status)) this.#messageUnavailable();
            else throw error;
          }
        }
        return;
      }
      const first = this.#list.querySelector<HTMLElement>("[data-sequence]");
      const known = this.options.messageChanges && first ? `&knownFrom=${first.dataset.sequence}` : "";
      const page = await this.#historyRequest<CloudPage<CloudMessage> & { removedIds?: string[] }>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=forward&cursor=${this.#lastSequence}${known}`);
      if (version !== this.#version) return;
      const removed = new Set(page.removedIds ?? []);
      for (const row of this.#list.querySelectorAll<HTMLElement>("[data-message-id]")) if (removed.has(row.dataset.messageId!)) {
        this.#removeMessage(row);
      }
      const scroll = this.#list;
      const atBottom = !scroll || scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 180;
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender)) continue;
        if (this.#seen.has(message.id)) continue;
        this.#list.querySelector(".kl-group-empty")?.remove();
        this.#seen.add(message.id); this.#loadedMessages.set(message.id, message); this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        this.#insert(message); this.#count++;
      }
      while (this.#list.querySelectorAll("[data-message-id]").length > 200) {
        const first = this.#list.querySelector("[data-message-id]")!;
        if (first instanceof HTMLElement) {
          const id = first.dataset.messageId ?? "";
          this.#seen.delete(id); this.#loadedMessages.delete(id);
        }
        first.remove(); this.#count--;
      }
      this.#syncMessageLayout();
      this.#new.onclick = null;
      this.#new.hidden = atBottom && page.nextCursor === null;
      if (page.nextCursor !== null) { this.#new.hidden = false; this.#new.onclick = () => void this.ui.options.run(() => this.updates()); }
      if (atBottom) this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
      const read = this.#canRead() && atBottom;
      this.options.observed?.(page.items, read);
      this.#acknowledge(page.items, read); this.#historyTimeline.sync();
    } finally {
      this.#updating = false;if(this.#active)this.#syncDraft();
      if (this.#updateAgain && this.#active) { this.#updateAgain = false; void this.ui.options.run(() => this.updates()); }
    }
  }
  async send(): Promise<void> {
    if (this.#historyTimeline.active) return;
    if (this.#sendState.pending || this.#sendState.upload?.files.length || !this.#editable() || (!this.#reply.hasContent && !this.draft.mediaIds?.length && !this.draft.audioIds?.length)) return;
    const submission = this.#sendState.restored ?? { text: this.draft.text, clientId: this.draft.clientId, mediaIds: [...(this.draft.mediaIds ?? [])], audioIds: [...(this.draft.audioIds ?? [])],action:this.#draftAction() };
    this.#live?.signal(false);
    this.#draft.focus({ preventScroll: true });
    await this.#submit(submission, true);
  }
  async #retry(submission: GroupSubmission): Promise<void> {
    if (this.#sendState.pending || !this.#canMutate() || submission.action.held || !this.#sendState.failed.has(submission)) return;
    const detach = this.#sendState.restored === submission;
    if (detach) this.#live?.signal(false);
    await this.#submit(submission, detach);
  }
  #discardFailed(): void {
    const first = this.#sendState.failed.values().next().value;
    if (!first || this.#sendState.pending || !this.#active||!this.#identity()) return;
    const discard=()=>{this.#sendState.failed.delete(first);if(first.action.source&&this.#sendState.restored===first)first.action.hold();this.#notifyDraft();};
    if(first.action.source){this.ui.confirm(this.#failed,'Stop retrying this message? It may already have been accepted by the server. The visible draft is kept for copying.',async()=>discard(),'Stop retrying');return;}
    discard();
    // The visible draft remains editable. An unchanged restored message keeps
    // its original id in case it was accepted before its response was lost.
    this.#notifyDraft();
  }
  async #submit(submission: GroupSubmission, detach: boolean): Promise<void> {
    const version = this.#version, { text, clientId, mediaIds = [], audioIds = [] } = submission;
    const state = this.#sendState;
    const nextClientId = detach ? crypto.randomUUID() : this.draft.clientId;
    state.pending = submission;
    if (detach) {
      // Commit the complete submission before awaiting the network. Later typing
      // belongs solely to the next draft, even when its text matches this one.
      this.draft.text = ""; if (this.draft.audioIds) this.draft.audioIds = []; if (this.draft.mediaIds) this.draft.mediaIds = []; this.draft.clientId = nextClientId;
      state.restored = undefined;state.draftAction=undefined;state.revision++;
    }
    const revision = state.revision;
    this.#notifyDraft(detach);
    let message: CloudMessage;
    let restored = false;
    try {
      const result = await submission.action.send<CloudMessage>({
        text, clientId, membershipVersion: this.group.membershipVersion, keyVersion: this.group.keyVersion,
        schemaVersion: 1, encryption: "server-aes-256-gcm",
        ...(mediaIds.length ? { mediaIds } : {}), ...(audioIds.length ? { audioIds } : {}),
      },()=>version===this.#version&&this.#canMutate());
      if(!result)throw new Error('Message not confirmed. Its original details are kept.');
      message=result;
      state.failed.delete(submission);
    } catch (error) {
      state.failed.add(submission);
      if (detach && this.draft.clientId === nextClientId && state.revision === revision && !this.draft.text && !this.draft.mediaIds?.length && !this.draft.audioIds?.length) {
        this.draft.text = text; if (audioIds.length || this.draft.audioIds) this.draft.audioIds = [...audioIds]; if (mediaIds.length || this.draft.mediaIds) this.draft.mediaIds = [...mediaIds]; this.draft.clientId = clientId; state.restored = submission;state.draftAction=submission.action;
        restored = true;
      }
      throw error;
    } finally { state.pending = undefined; this.#notifyDraft(restored); }
    if (version !== this.#version) return;
    if (!this.#browsingPin && !this.#seen.has(message.id)) {
      this.#list.querySelector(".kl-group-empty")?.remove();
      this.#seen.add(message.id); this.#loadedMessages.set(message.id, message); this.#insert(message); this.#count++;
      this.#syncMessageLayout();
    }
    // A refresh failure cannot turn an accepted send into a retry. Keep the
    // receive cursor before this send so intervening messages are still fetched.
    await this.updates();
    if (!this.#browsingPin) this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
  }
  #insert(message: CloudMessage): void {
    const next = [...this.#list.children].find(node => node instanceof HTMLElement && Number(node.dataset.sequence) > message.sequence);
    this.#list.insertBefore(this.#row(message), next ?? null);
  }
  #syncMessageLayout(): void {
    syncDateSeparators(this.#list, "[data-message-time]", this.options.platformPreview ? "compact" : "full");
    if (!this.options.platformPreview) return;
    const pinned = this.group.pinnedMessage?.id;
    let previous: CloudMessage | undefined;
    for (const row of this.#list.querySelectorAll<HTMLElement>(".kl-group-message")) {
      const message = this.#messages.get(row);
      const grouped = previous?.text != null && message?.text != null && previous.sender === message.sender &&
        previous.id !== pinned && message.id !== pinned && !row.hasAttribute("data-reply") &&
        localDay(previous.createdAt) === localDay(message.createdAt) &&
        message.createdAt >= previous.createdAt && message.createdAt - previous.createdAt < 300_000;
      row.toggleAttribute("data-grouped", grouped);
      const author = row.querySelector<HTMLButtonElement>(".kl-social-name");
      if (author) author.tabIndex = grouped ? -1 : 0;
      previous = message;
    }
  }
  #project(message: CloudMessage): CloudMessage | undefined {
    return this.options.presentation ? this.options.presentation.project(this.group, this.options.history?.generation, message) : message;
  }
  #row(original: CloudMessage): HTMLElement {
    const message = this.#project(original);
    if (!message) return element('div', { hidden: true });
    if (this.ui.options.isBlocked(message.sender)) return element("div", { hidden: true });
    const author = this.ui.member(message.sender, message.createdAt, undefined, this.options.platformPreview === true, this.options.platformPreview === true);
    const time = author.querySelector("time");
    const own = message.sender === this.ui.options.client.memberNumber;
    if (time) {
      time.classList.add("kl-message-time");
      bindClockText(time, message.createdAt);
      // Rows only enter this thread through a successful Cloud response, so
      // saving is confirmed even before any recipient acknowledges the message.
      if (own || this.options.platformPreview) {
        const stamp = element("span", { className: "kl-message-stamp", ariaLabel: "Message time and receipt" });
        time.replaceWith(stamp); stamp.append(time);
        if (own) stamp.append(messageReceiptIndicator(message.receiptState === "read" ? "read" : "sent", "Read by everyone"));
        else stamp.removeAttribute("aria-label");
      }
    }
    const content = element("div", { className: "kl-group-message-text" });
    if (message !== original) {
      const stamp = author.querySelector('.kl-message-stamp');
      stamp?.prepend(element('small', { className:'kl-message-edited', text:'Edited', title:'Edited on this device' }));
    }
    const reply = message.text ? parseInlineReplyContext(message.text) : undefined;
    if (reply) content.append(replyPreview(reply));
    const text = reply?.content ?? message.text ?? "Message removed";
    appendMentionText(content, text, parseMessageLinks(text), undefined,
      shiftMentions(message.mentions, (message.text?.length ?? 0) - text.length),
      member => { if (!this.ui.options.isBlocked(member)) this.ui.options.openProfile(member, `Member ${member}`); });
    const bubble = element("div", { className: "kl-group-message-bubble kl-message-bubble" }, content);
    const header = this.options.platformPreview && author.querySelector(".kl-social-author-copy");
    if (header) bubble.prepend(header);
    if (message.text !== null) for (const id of message.audioIds ?? []) bubble.append(this.#audio.render(id,undefined,undefined,this.#source?.generation));
    if (message.text !== null && message.mediaIds?.length) bubble.append(element("div", { className: "kl-group-message-images" },
      ...message.mediaIds.map(id => {
        const image = this.ui.options.image(id, "Group image", "kl-cloud-image");
        if (this.options.platformPreview) {
          let restorePosition: (() => void) | undefined;
          const currentImage = () => image.isConnected && this.#list.contains(image);
          image.addEventListener("cloud-image-before-paint", () => {
            restorePosition = currentImage() ? this.#captureHistoryPosition() : undefined;
          });
          image.addEventListener("cloud-image-ready", () => {
            if (currentImage()) restorePosition?.();
            restorePosition = undefined;
          });
        }
        return image;
      })));
    const line = element("div", { className: "kl-message-line kl-group-message-line" }, bubble);
    const row = element("article", { className: "kl-group-message kl-message-interaction" }, author, line);
    row.dataset.messageId = message.id; row.dataset.sequence = String(message.sequence); row.dataset.own = String(own);
    row.dataset.messageTime = String(message.createdAt);
    if (message.text !== null && message.mediaIds?.length) row.dataset.media = "true";
    row.dataset.direction = line.dataset.direction = own ? "outgoing" : "incoming";
    row.toggleAttribute("data-reply", Boolean(reply));
    this.#messages.set(row, message);
    if (message.text !== null) {
      this.#reactions?.attach(message.id, bubble);
      row.dataset.actionable = "true"; bubble.tabIndex = 0;
      const actions = messageActions(
        () => { void this.ui.options.run(async () => this.#replyTo(row)); },
        () => this.#copy(row),
        error => { void this.ui.options.run(() => Promise.reject(error)); },
        this.options.platformPreview ? more => this.#controls.open(row, more) : undefined,
      );
      if (!message.text) actions.querySelector('[aria-label="Copy message"]')?.remove();
      line.append(actions);
    }
    return row;
  }
  #acknowledge(messages: CloudMessage[], read: boolean): void {
    if (this.options.history&&!this.options.history.current() || this.#historyArchive.active || this.#historyCopies.active || this.#historyTimeline.active) return;
    if (!this.options.messageReceipts || !messages.length) return;
    const deliveredIds = messages.filter(message => message.sender !== this.ui.options.client.memberNumber).map(message => message.id);
    const readIds = read ? messages.filter(message => message.sender !== this.ui.options.client.memberNumber && !this.ui.options.isBlocked(message.sender)).map(message => message.id) : [];
    if (deliveredIds.length || readIds.length) this.options.acknowledgeReceipts?.(deliveredIds, readIds);
  }
  async refreshReceipts(): Promise<void> {
    if (this.#historyTimeline.active) return;
    if (!this.options.messageReceipts || !this.#active) return;
    const messageIds = [...this.#loadedMessages.values()]
      .filter(message => message.sender === this.ui.options.client.memberNumber)
      .map(message => message.id);
    if (!messageIds.length) return;
    const result = await this.#historyRequest<{ items: Array<{ messageId: string; state: "delivered" | "read" | null }> }>(
      "POST", `/v1/conversations/${this.group.conversationId}/receipts/query`, { ids: messageIds },
    );
    for (const { messageId: id, state } of result.items) {
      const message = this.#loadedMessages.get(id);
      const row = [...this.#list.querySelectorAll<HTMLElement>("[data-message-id]")].find(node => node.dataset.messageId === id);
      const indicator = row?.querySelector<HTMLElement>(".kl-message-receipt");
      if (!message || !indicator) continue;
      message.receiptState = state;
      updateMessageReceipt(indicator, state === "read" ? "read" : "sent", "Read by everyone");
    }
  }
  #replyTo(row: HTMLElement): void {
    const message = this.#messages.get(row);
    if (!this.#editable() || !row.isConnected || !message || message.text === null || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return;
    const name = row.querySelector(".kl-social-name")?.textContent || `Member ${message.sender}`;
    this.#reply.replyTo(name, message.text || "Image"); this.#replyMessageId = message.id; this.#controls.close();
  }
  async #copy(row: HTMLElement): Promise<void> {
    const message = this.#messages.get(row);
    if (!this.#active || !message?.text || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return;
    await copyMessageText(message.text);
  }
  #quickActions(row: HTMLElement): HTMLElement[] {
    return [this.ui.button("Reply", () => this.#replyTo(row), "reply"),
      this.ui.button("Copy message", () => this.#copy(row), "copy")];
  }
  #editLocal(row: HTMLElement, message: CloudMessage, mode: 'edit' | 'delete'): void {
    const store = this.options.presentation, original = this.#loadedMessages.get(message.id);
    const current = () => this.#canMutate() && this.ui.options.client.connected && row.isConnected && this.#list.contains(row) &&
      this.group.members.some(member=>member.memberNumber===this.ui.options.client.memberNumber && member.status==='active') &&
      !!original && this.#loadedMessages.get(message.id) === original && original.text !== null &&
      this.#project(original)?.text === message.text && message.sender === this.ui.options.client.memberNumber;
    if (!store || !original || !current()) return;
    this.#controls.close();
    if (!this.#localEditor.element.isConnected) this.element.append(this.#localEditor.element);
    openLocalMessageEditor(this.#localEditor, this.element.closest<HTMLElement>('.kl-panel') ?? this.element, {
      mode, text: message.text ?? '', attachments: !!(message.mediaIds?.length || message.audioIds?.length), current,
      save: async value => {
        if (!current()) throw new Error('This message changed. Reopen it before saving.');
        store.change(this.group, this.options.history?.generation, original, value, this.options.persistLocalChanges?.() === true);
      },
      done: () => {
        if (!row.isConnected) return;
        const restore = this.#captureHistoryPosition();
        if (mode === 'delete' && this.#replyMessageId === message.id) { this.#reply.cancel(); this.#replyMessageId = undefined; }
        row.replaceWith(this.#row(original)); this.#renderPin(); this.#syncMessageLayout(); this.#historyTimeline.sync();
        this.options.localChanged?.(); restore?.();
      },
    });
  }
  #contextActions(row: HTMLElement): HTMLElement[] {
    const message = this.#messages.get(row);
    if (!message || message.text === null || !row.dataset.actionable || this.ui.options.isBlocked(message.sender)) return [];
    const own = this.group.members.find(m => m.memberNumber === this.ui.options.client.memberNumber);
    const actions = message.text ? this.#quickActions(row) : [this.ui.button("Reply", () => this.#replyTo(row), "reply")];
    if (this.options.platformPreview && this.#reactions) {
      const trigger = row.querySelector<HTMLButtonElement>(".kl-message-reaction-trigger");
      const react = this.ui.button("React…", () => trigger?.click(), "heart");
      react.disabled = !trigger || trigger.disabled;
      const people = this.ui.button("Who reacted", () => this.#reactions?.showParticipants(message.id, row, (member, name) => this.ui.options.openProfile(member, name)), "users");
      people.disabled = !this.#reactions.participants(message.id, row);
      actions.unshift(react, people);
    }
    if (this.options.groupPins && (own?.role === "owner" || own?.role === "admin")) actions.push(
      this.ui.button(this.group.pinnedMessage?.id === message.id ? "Unpin message" : "Pin message", this.#pinAction(this.group.pinnedMessage?.id === message.id ? null : message.id), "pin"));
    const local = this.options.platformPreview && !!this.options.presentation;
    if (local && own?.status === 'active' && message.sender === this.ui.options.client.memberNumber && !this.options.archived?.()) actions.push(
      this.ui.button('Edit message', () => this.#editLocal(row, message, 'edit'), 'edit'),
      this.ui.button('Delete message…', () => this.#editLocal(row, message, 'delete'), 'trash'));
    if (message.sender === this.ui.options.client.memberNumber || own?.role === "owner" || own?.role === "admin") actions.push(
      this.ui.button(local ? "Delete from group…" : "Delete message", () => this.ui.confirm(row, local ? "Delete this message for everyone in the group?" : "Delete this message?", async () => {
        if(!this.#canMutate()||!row.isConnected)return;
        const path=`/v1/conversations/${this.group.conversationId}/messages/${message.id}`;
        let action=this.#sendState.actions.get(path);
        if(!action){action=this.#makeAction('delete',path,message.id,this.#loadedMessages.get(message.id)?.text??'');this.#sendState.actions.set(path,action);}
        await this.#runAction(action);
      }), "trash"));
    if (message.sender !== this.ui.options.client.memberNumber) actions.push(
      this.ui.button("Report", () => this.options.report(row, message.id), "warning"),
      this.ui.button("Block in Cloud", () => confirmCloudBlock(this.ui,row,message.sender,()=>this.#canMutate()&&row.isConnected,async () => {
        for (const node of this.#list.querySelectorAll<HTMLElement>(".kl-group-message")) {
          if (this.#messages.get(node)?.sender === message.sender) { this.#seen.delete(node.dataset.messageId!); node.remove(); this.#count--; }
        }
        this.#controls.close();
      }), "lock"));
    return actions;
  }
  #removeMessage(row: HTMLElement): void {
    if (this.group.pinnedMessage?.id === row.dataset.messageId) { this.group.pinnedMessage = { ...this.group.pinnedMessage!, text: null }; this.#renderPin(); }
    row.querySelector(".kl-group-message-text")!.textContent = "Message removed";
    row.querySelector(".kl-group-message-images")?.remove();
    delete row.dataset.media;
    row.querySelector(".kl-message-reactions")?.remove();
    row.querySelector(".kl-message-side-actions")?.remove();
    row.querySelector(".kl-message-bubble")?.removeAttribute("tabindex");
    this.#messages.delete(row);
    if (row.dataset.messageId) this.#loadedMessages.delete(row.dataset.messageId);
    delete row.dataset.actionable; this.#controls.close(); this.#historyTimeline.sync();
    if (this.options.platformPreview) this.#syncMessageLayout();
  }
  #renderPin(): void {
    const pin = this.group.pinnedMessage && this.#project(this.group.pinnedMessage);
    const unpin=this.#pinAction(null);this.#pinRemove.onclick=()=>{void this.ui.options.run(unpin);};
    this.#pin.hidden = !this.options.groupPins || !pin || this.ui.options.isBlocked(pin.sender);
    this.#pinRow.hidden = this.#pin.hidden;
    this.#pinRemove.hidden = true;
    if (this.#pin.hidden || !pin) { this.#pinStatus.hidden = true; return; }
    const own = this.group.members.find(member => member.memberNumber === this.ui.options.client.memberNumber);
    this.#pinRemove.hidden = !(own?.role === "owner" || own?.role === "admin");
    const profile = this.ui.options.client.peekProfile?.(pin.sender);
    if (!profile && this.#pinProfile !== pin.sender) {
      this.#pinProfile = pin.sender; const version = this.#version;
      void this.ui.options.client.profile(pin.sender).then(() => { if (this.#active && version === this.#version && this.group.pinnedMessage?.id === pin.id) this.#renderPin(); }).catch(() => {});
    }
    const author = profile?.displayName || `Member ${pin.sender}`;
    const excerpt = pin.text === null ? "Message unavailable" : pin.text ? parseInlineReplyContext(pin.text)?.content ?? pin.text : "Image";
    this.#pin.replaceChildren(kikiIcon("pin"), element("span", { text: `Pinned message · ${author}: ${excerpt.replace(/\s+/gu, " ").slice(0, 160)}` }));
    this.#pin.title = "Go to pinned message";
  }
  #pinAction(messageId:string|null):()=>Promise<void>{const revision=this.group.pinRevision??0;return ()=>this.#setPin(messageId,revision);}
  async #setPin(messageId: string | null,revision:number): Promise<void> {
    if (this.#pinBusy || !this.#active) return;
    const version = this.#version; this.#pinBusy = true; this.#pinRemove.disabled = true;
    try {
      const queue=this.options.management,source=this.options.history?.managementSource;
      let pin:Pick<CloudGroup,'pinnedMessage'|'pinRevision'>;
      if(queue&&source){
        const entry=queue.capture(`${this.group.id}:pin`,{action:'pin',groupId:this.group.id,membershipVersion:this.group.membershipVersion,label:`${this.group.title} · ${messageId?'pin message':'unpin message'}`},source,{messageId,revision});
        if(entry.intent.pending||!await queue.perform(entry,()=>this.#active&&version===this.#version))return;
        pin=await this.#historyRequest<CloudGroup>('GET',`/v1/groups/${this.group.id}`);
      }else pin=await this.ui.options.client.request<Pick<CloudGroup,'pinnedMessage'|'pinRevision'>>('PUT',`/v1/groups/${this.group.id}/pin`,{messageId,revision});
      if (version !== this.#version) return;
      Object.assign(this.group, pin); this.#renderPin(); this.#controls.close();
      if (this.options.platformPreview) this.#syncMessageLayout();
    } catch (error) {
      if (version === this.#version && error instanceof CloudError && error.status === 409) await this.updates();
      throw error;
    } finally { this.#pinBusy = false; this.#pinRemove.disabled = false; }
  }
  async #jumpToPin(): Promise<void> {
    const pin = this.group.pinnedMessage && this.#project(this.group.pinnedMessage);
    if (pin) await this.openMessage(pin.id);
  }
  #messageUnavailable(): void {
    this.#controls.close(); this.#list.replaceChildren(); this.#seen.clear(); this.#loadedMessages.clear(); this.#count = 0;
    this.#pinStatus.textContent = "This message is no longer available."; this.#pinStatus.hidden = false;
  }
  async openMessage(id: string): Promise<void> {
    this.#historyTimeline.close();
    if (!this.#active || this.#loading || this.#updating) return;
    const version = this.#version;
    this.#messageTarget = id; this.options.messageTargetChanged?.(id);
    this.#browsingPin = true; this.#new.hidden = false; this.#new.textContent = "Back to latest"; this.#new.onclick = null;
    this.#new.setAttribute("aria-label", "Back to latest");
    this.#pinStatus.textContent = "Finding message…"; this.#pinStatus.hidden = false;
    this.#loading = true; this.#pin.disabled = true;
    const root = this.element.getRootNode() as Document | ShadowRoot, originalFocus = root.activeElement;
    try {
      // Recheck access/deletion at navigation time, even if an old row remains cached.
      const original = await this.#historyRequest<CloudMessage>("GET", `/v1/conversations/${this.group.conversationId}/messages/${encodeURIComponent(id)}`);
      if (version !== this.#version) return;
      if (original.id !== id || original.conversationId !== this.group.conversationId || !Number.isSafeInteger(original.sequence) || original.sequence <= 0 ||
        original.text === null || !this.#project(original) || this.ui.options.isBlocked(original.sender)) throw new CloudError("message_unavailable", 404);
      {
        const page = await this.#historyRequest<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=${original.sequence + 1}`);
        if (version !== this.#version) return;
        if (!Array.isArray(page.items) || page.items.length > 40 || page.items.some(item => item.conversationId !== this.group.conversationId || item.sequence > original.sequence) ||
          !page.items.some(item => item.id === id && item.sequence === original.sequence && item.text !== null && !this.ui.options.isBlocked(item.sender))) throw new CloudError("message_unavailable", 404);
        this.#controls.close(); this.#list.replaceChildren(this.#more); this.#seen.clear(); this.#loadedMessages.clear(); this.#count = 0;
        for (const message of page.items) if (!this.ui.options.isBlocked(message.sender)) {
          this.#seen.add(message.id); this.#loadedMessages.set(message.id, message); this.#list.append(this.#row(message)); this.#count++;
        }
        this.#olderCursor = page.nextCursor ?? 0; this.#more.hidden = page.nextCursor === null;
        this.#lastSequence = original.sequence;
        this.#syncMessageLayout();
      }
      if (!this.#scroll) { this.#scroll = this.#list; this.#scroll.addEventListener("scroll", this.#onScroll, { passive: true }); }
      this.#live?.resume();
      const row = [...this.#list.querySelectorAll<HTMLElement>("[data-message-id]")].find(row => row.dataset.messageId === id);
      this.#pinStatus.hidden = true;
      row?.scrollIntoView?.({ block: "center" });
      if (root.activeElement === originalFocus) row?.querySelector<HTMLElement>(".kl-message-bubble")?.focus({ preventScroll: true });
      if (row) {
        clearTimeout(this.#highlight);
        for (const old of this.#list.querySelectorAll<HTMLElement>("[data-highlight]")) delete old.dataset.highlight;
        row.dataset.highlight = "true";
        this.#highlight = setTimeout(() => { delete row.dataset.highlight; }, 2400);
      }
    } catch (error) {
      if (version !== this.#version) return;
      this.#messageUnavailable();
      if (!(error instanceof CloudError && [403, 404].includes(error.status))) this.#pinStatus.replaceChildren(
        element("span", { text: "Could not load the message. " }), this.ui.button("Retry opening message", () => this.openMessage(id), "refresh"));
    } finally { this.#loading = false; this.#pin.disabled = false; }
  }
  async #latest(): Promise<void> {
    if (this.#loading) return;
    const version = this.#version; this.#loading = true;
    try {
      const page = await this.#historyRequest<CloudPage<CloudMessage>>("GET", `/v1/conversations/${this.group.conversationId}/messages?limit=40&direction=backward&cursor=0`);
      if (version !== this.#version) return;
      this.#browsingPin = false; this.#messageTarget = undefined; this.options.messageTargetChanged?.(undefined);
      this.#pinStatus.hidden = true; this.#olderCursor = page.nextCursor ?? 0; this.#seen.clear(); this.#loadedMessages.clear(); this.#count = 0; this.#lastSequence = 0;
      this.#controls.close(); this.#list.replaceChildren(this.#more); this.#new.hidden = true; this.#new.textContent = "New messages";
      this.#new.setAttribute("aria-label", "New messages");
      if (!this.#scroll) { this.#scroll = this.#list; this.#scroll.addEventListener("scroll", this.#onScroll, { passive: true }); }
      for (const message of page.items) {
        this.#lastSequence = Math.max(this.#lastSequence, message.sequence);
        if (this.ui.options.isBlocked(message.sender)) continue;
        this.#seen.add(message.id); this.#loadedMessages.set(message.id, message); this.#list.append(this.#row(message)); this.#count++;
      }
      this.#more.hidden = page.nextCursor === null;
      this.#syncMessageLayout();
      this.#list.lastElementChild?.scrollIntoView?.({ block: "nearest" });
      this.options.observed?.(page.items, this.#canRead());
      this.#acknowledge(page.items, this.#canRead());
    } finally { this.#loading = false; }
  }
}
