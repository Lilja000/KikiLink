import {ZipThreadHistoryImportPanel} from './zip-thread-history-import';
import { ZipChatFileImportPanel } from './zip-chat-files-import';
import { ZipFeedImportPanel } from './zip-feed-import';
import type { FeedImportDestination } from '../../storage/feed-archive-import';
import { ZipSoundImportPanel, type SoundImportDestination } from './zip-sound-import';
import { ZipSoundAssignmentsPanel } from './zip-sound-assignments';
import { ZipMusicImportPanel } from './zip-music-import';
import type { MusicStore } from '../../storage/device-music-store';
import { reviewDeviceArchive, type DeviceArchiveReview } from '../../storage/device-data-review';
import { element } from '../../utils/dom';
import type { SettingsStore } from '../../core/settings';
import { ZipSettingsRestorePanel } from './zip-settings-restore';
import { ZipGalleryImportPanel } from './zip-gallery-import';
import { ZipChatImportPanel } from './zip-chat-import';
import { ZipChatAttachmentImportPanel } from './zip-chat-attachment-import';
import type { ChatService } from '../link-chat/chat-service';
import { DeviceRestoreSession } from '../../storage/device-restore-session';
import type { DeviceImportCheckpoint } from '../../storage/device-restore-point-model';

export class DeviceDataReviewPanel {
  readonly element = element('section', { ariaLabel: 'Device archive review' });
  readonly #input = element('input', { ariaLabel: 'Device ZIP file' });
  readonly #choose = element('button', { type: 'button', className: 'kl-text-button', text: 'Choose device ZIP', onClick: () => { if (this.#active() && !this.#controller) this.#input.click(); } });
  readonly #cancel = element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel check', onClick: () => this.close() });
  readonly #dismiss = element('button', { type: 'button', className: 'kl-text-button', text: 'Dismiss review', onClick: () => this.close() });
  readonly #status = element('p', { className: 'kl-setting-help' });
  readonly #contents = element('section', { ariaLabel: 'Device archive contents' });
  #controller: AbortController | undefined;
  #generation = 0;
  #destroyed = false;
  #session: DeviceRestoreSession | undefined;
  readonly #restore: ZipSettingsRestorePanel | undefined;
  readonly #chat: ZipChatImportPanel | undefined;
  readonly #chatAttachments: ZipChatAttachmentImportPanel | undefined;
  readonly #gallery: ZipGalleryImportPanel;
  readonly #chatFiles: ZipChatFileImportPanel;
  readonly #threadHistory:ZipThreadHistoryImportPanel;
  readonly #sounds: ZipSoundImportPanel | undefined;
  readonly #soundChoices: ZipSoundAssignmentsPanel | undefined;
  readonly #feed: ZipFeedImportPanel | undefined;
  readonly #music: ZipMusicImportPanel | undefined;
  constructor(readonly owner: number, readonly current: () => boolean, store?: SettingsStore, service?: ChatService, changed?: () => void, music?: MusicStore, sounds?: SoundImportDestination, feed?: FeedImportDestination, readonly version?: string) {
    const checkpoint:DeviceImportCheckpoint|undefined=version===undefined?undefined:(action,current,signal,apply)=>{
      if(!this.#session)throw new Error('Select and check a device ZIP before importing.');return this.#session.run(action,current,signal,apply);
    };
    this.#restore = store ? new ZipSettingsRestorePanel(store,owner,() => this.#active(),checkpoint) : undefined;
    this.#chat = service ? new ZipChatImportPanel(service,owner,() => this.#active(),changed,checkpoint) : undefined;
    this.#chatAttachments = service ? new ZipChatAttachmentImportPanel(service,owner,() => this.#active(),changed,checkpoint) : undefined;
    this.#threadHistory=new ZipThreadHistoryImportPanel(owner,()=>this.#active(),checkpoint);
    this.#chatFiles = new ZipChatFileImportPanel(owner,() => this.#active(),changed,checkpoint);
    this.#gallery = new ZipGalleryImportPanel(owner,() => this.#active(),changed,checkpoint);
    this.#music = store && music ? new ZipMusicImportPanel(owner,() => this.#active(),store,music,changed,checkpoint) : undefined;
    this.#feed = feed ? new ZipFeedImportPanel(owner,() => this.#active(),feed,checkpoint) : undefined;
    this.#sounds = sounds ? new ZipSoundImportPanel(owner,() => this.#active(),sounds.store,sounds.changed,checkpoint) : undefined;
    this.#soundChoices = store && sounds ? new ZipSoundAssignmentsPanel(owner,() => this.#active(),store,sounds.store,sounds.changed,checkpoint) : undefined;
    this.#input.type = 'file'; this.#input.accept = '.zip,application/zip';
    this.#input.hidden = true; this.#cancel.hidden = this.#dismiss.hidden = this.#contents.hidden = true; this.#status.setAttribute('role','status');
    this.#input.addEventListener('change', () => { const file = this.#input.files?.[0]; this.#input.value = ''; if (file && this.#active()) void this.reviewBlob(file); });
    this.element.append(element('h3', { text: 'Review a device ZIP' }),
      element('p', { className: 'kl-setting-help', text: 'Choose a backup to review its contents. Nothing changes until you confirm what to restore.' }),
      ...(checkpoint?[element('p',{className:'kl-setting-help',text:'A restore point is kept before importing. Download a separate backup too; browser data can be cleared.'})]:[]),
      element('div', { className: 'kl-setting-tool-buttons' }, this.#choose, this.#cancel, this.#dismiss), this.#input, this.#status, this.#contents);
    if (this.#restore) this.element.append(this.#restore.element);
    if (this.#chat) this.element.append(this.#chat.element);
    if (this.#chatAttachments) this.element.append(this.#chatAttachments.element);
    this.element.append(this.#gallery.element,this.#chatFiles.element,this.#threadHistory.element);
    if (this.#sounds) this.element.append(this.#sounds.element);
    if (this.#soundChoices) this.element.append(this.#soundChoices.element);
    if (this.#feed) this.element.append(this.#feed.element);
    if (this.#music) this.element.append(this.#music.element);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #busy(value: boolean): void { this.#choose.disabled = value; this.#cancel.hidden = !value; this.element.setAttribute('aria-busy',String(value)); }
  refresh(): void { this.#chatFiles.refresh(); this.#gallery.refresh(); this.#music?.refresh(); this.#sounds?.refresh(); this.#feed?.refresh(); }
  close(): void {
    this.#session?.close();this.#session=undefined;
    const pending = Boolean(this.#controller); ++this.#generation; this.#controller?.abort(); this.#controller = undefined; this.#busy(false);
    this.#input.value = ''; this.#contents.replaceChildren(); this.#contents.hidden = this.#dismiss.hidden = true;
    this.#restore?.setArchive(undefined);
    this.#soundChoices?.setArchive(undefined);
    this.#chatAttachments?.setArchive(undefined);
    this.#chat?.setArchive(undefined); this.#gallery.setArchive(undefined); this.#chatFiles.setArchive(undefined); this.#threadHistory.setArchive(undefined); this.#music?.setArchive(undefined); this.#sounds?.setArchive(undefined); this.#feed?.setArchive(undefined);
    this.#status.setAttribute('role','status'); this.#status.textContent = pending ? 'Archive review cancelled.' : '';
  }
  destroy(): void { this.#destroyed = true; this.close(); this.#restore?.destroy(); this.#soundChoices?.destroy(); this.#chat?.destroy(); this.#chatAttachments?.destroy(); this.#gallery.destroy(); this.#chatFiles.destroy(); this.#threadHistory.destroy(); this.#music?.destroy(); this.#sounds?.destroy(); this.#feed?.destroy(); }
  async reviewBlob(file: Blob): Promise<void> {
    if(!this.#active())return;
    this.close(); const generation = ++this.#generation, controller = new AbortController(); this.#controller = controller; this.#busy(true);
    const current = () => generation === this.#generation && this.#active();
    this.#status.textContent = 'Checking archive…';
    try {
      const review = await reviewDeviceArchive(file, { owner: this.owner, signal: controller.signal, current,
        progress: message => { if (current()) this.#status.textContent = message; } });
      if (!current() || controller.signal.aborted) return;
      if(this.version!==undefined)this.#session=new DeviceRestoreSession(this.owner,this.version,file);
      this.#soundChoices?.setArchive(review);
      this.#render(review); this.#restore?.setArchive(review); this.#chat?.setArchive(review); this.#chatAttachments?.setArchive(review); this.#gallery.setArchive(review); this.#chatFiles.setArchive(review); this.#threadHistory.setArchive(review); this.#music?.setArchive(review); this.#sounds?.setArchive(review); this.#feed?.setArchive(review); this.#status.textContent = 'Archive checked. Your saved data has not changed.'; this.#dismiss.hidden = false;
    } catch (error) {
      if (current()) { this.#status.setAttribute('role','alert'); this.#status.textContent = error instanceof Error ? error.message : 'The device archive could not be checked.'; }
    } finally { if (generation === this.#generation) { this.#controller = undefined; this.#busy(false); } }
  }
  #render(review: DeviceArchiveReview): void {
    const date = new Date(review.exportedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const source = element('p', { className: 'kl-setting-help', text: `Saved on ${date} (UTC) · Version ${review.addonVersion}` }); source.style.overflowWrap = 'anywhere';
    const files = review.binaryBytes < 1024 ? `${review.binaryBytes} bytes` : review.binaryBytes < 1024*1024 ? `${(review.binaryBytes/1024).toFixed(1)} KiB` : `${(review.binaryBytes/(1024*1024)).toFixed(1)} MiB`;
    this.#contents.replaceChildren(source,
      element('p', { className: 'kl-setting-help', text: `${review.accountEntries} saved ${review.accountEntries === 1 ? 'entry' : 'entries'} · ${review.binaryFiles} included ${review.binaryFiles === 1 ? 'file' : 'files'} (${files})` }),
      element('ul', { className: 'kl-setting-help' }, ...review.databases.map(db => element('li', { text: `${db.label}: ${db.status === 'absent' ? 'not present in this export' : `${db.records} ${db.records === 1 ? 'record' : 'records'}`}` }))),
      element('p', { className: 'kl-setting-help', text: 'This is saved device data, not a complete Cloud backup. Integrity checks detect damage; they do not prove who created the archive.' }));
    if (review.excludedKeys) this.#contents.append(element('p', { className: 'kl-setting-help', text: `${review.excludedKeys} account ${review.excludedKeys === 1 ? 'entry was' : 'entries were'} excluded from the export.` }));
    this.#contents.hidden = false;
  }
}
