import {SavedDeviceFilesPanel, savedDeviceFileReferences} from './saved-device-files';
import {SavedDeviceFiles} from '../../storage/saved-device-files';
import type {GalleryStore} from '../../storage/device-gallery-store';
import {ContentDialog} from '../link-chat/content-dialog';
import {openLocalImages} from './local-image-storage';
import type { FeedImportDestination } from '../../storage/feed-archive-import';
import { type SoundImportDestination } from './zip-sound-import';
import type { MusicStore } from '../../storage/device-music-store';
import { exportDeviceData } from '../../storage/device-data-export';
import { element } from '../../utils/dom';
import { DeviceDataReviewPanel } from './device-data-review';
import type { SettingsStore } from '../../core/settings';
import type { ChatService } from '../link-chat/chat-service';
import type { CloudClient } from '../../cloud/client';
import { ChatFileBatchPanel } from './chat-file-batch-panel';
import { DeviceRestorePointsPanel } from './device-restore-points';

export class DeviceDataExportPanel {
  readonly element = element('section', { className: 'kl-setting-group', ariaLabel: 'Device data export' });
  readonly #status = element('p', { className: 'kl-setting-help' });
  readonly #download = element('button', { type: 'button', className: 'kl-text-button', text: 'Download device data', onClick: () => { void this.#start(); } });
  readonly #cancel = element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel export', onClick: () => this.close() });
  #controller: AbortController | undefined;
  #generation = 0;
  #destroyed = false;
  readonly #review: DeviceDataReviewPanel;
  readonly #chatFiles: ChatFileBatchPanel | undefined;
  readonly #restorePoints: DeviceRestorePointsPanel;
  readonly #savedFiles: SavedDeviceFilesPanel | undefined;
  readonly #fileStore: SavedDeviceFiles | undefined;
  readonly #imageDialog = new ContentDialog();
  constructor(readonly owner: number, readonly version: string, readonly current: () => boolean, store?: SettingsStore, service?: ChatService, changed?: () => void, music?: MusicStore, sounds?: SoundImportDestination, feed?: FeedImportDestination, client?: () => CloudClient | undefined) {
    this.#review = new DeviceDataReviewPanel(owner, () => this.#active(),store,service,changed,music,sounds,feed,version);
    this.#restorePoints = new DeviceRestorePointsPanel(owner,() => this.#active(),blob => this.#review.reviewBlob(blob),() => this.close());
    if (service && client) this.#chatFiles = new ChatFileBatchPanel(owner,{rules:() => service.deviceHistoryImportRules(owner),client,historyGuard:peer => service.cloudHistoryGuard(peer)},() => this.#active(),() => this.close());
    if (store) {
      this.#fileStore = new SavedDeviceFiles(owner, () => savedDeviceFileReferences(owner,store));
      this.#savedFiles = new SavedDeviceFilesPanel(owner,store,() => this.#active(),() => this.close(),this.#fileStore);
    }
    this.#status.setAttribute('role', 'status'); this.#cancel.hidden = true;
    const advanced = element('details', { className: 'kl-settings-disclosure' },
      element('summary', {}, element('span', { text: 'Advanced recovery' })),
      element('div', { className: 'kl-setting-group' },
        element('p', { className: 'kl-setting-help', text: 'Save chat attachments for offline use, review files kept on this device, or open a restore point from before an import. Remote files are not included until saved on this device.' }),
        ...(this.#chatFiles ? [this.#chatFiles.element] : []),
        ...(this.#savedFiles ? [this.#savedFiles.element] : []), this.#restorePoints.element));
    // A running recovery dialog must remain reachable if its disclosure is toggled.
    advanced.addEventListener('toggle', () => {
      if (!advanced.open && advanced.querySelector('dialog[open], [aria-busy="true"]')) advanced.open = true;
    });
    this.element.append(element('h3', { text: 'Back up & restore' }),
      element('p', { className: 'kl-setting-help', text: 'Download this account’s saved settings, chats, drafts and device files. Cloud-only data and unsaved changes are excluded.' }),
      element('p', { className: 'kl-setting-help', text: 'Private, unencrypted ZIP. Keep your backup somewhere safe.' }),
      element('div', { className: 'kl-setting-tool-buttons' }, this.#download, this.#cancel), this.#status,
      this.#review.element, advanced);
  }
  #active(): boolean { return !this.#destroyed && this.current(); }
  #busy(busy: boolean): void { this.#download.disabled = busy; this.#cancel.hidden = !busy; this.element.setAttribute('aria-busy', String(busy)); }
  refresh(): void { this.#review.refresh(); }
  openImages(host: HTMLElement, gallery: GalleryStore, openGallery: () => void): void {
    if (!this.#active() || !this.#fileStore) return;
    host.append(this.#imageDialog.element);
    openLocalImages(this.#imageDialog, gallery, this.#fileStore, () => this.#active(), openGallery);
  }
  close(): void {
    if (this.#imageDialog.element.open) this.#imageDialog.close();
    this.#savedFiles?.close();
    this.#chatFiles?.close();
    this.#restorePoints.close();
    this.#review.close();
    if (!this.#controller) return;
    ++this.#generation; this.#controller.abort(); this.#controller = undefined; this.#busy(false);
    this.#status.setAttribute('role', 'status'); this.#status.textContent = 'Device export cancelled.';
  }
  destroy(): void { this.#destroyed = true; this.close(); this.#imageDialog.destroy(); this.#review.destroy(); this.#chatFiles?.destroy(); this.#restorePoints.destroy(); this.#savedFiles?.destroy(); }
  async #start(): Promise<void> {
    if (!this.#active() || this.#controller) return;
    this.#savedFiles?.close();
    this.#chatFiles?.close();
    const generation = ++this.#generation, controller = new AbortController(); this.#controller = controller; this.#busy(true);
    const current = () => generation === this.#generation && this.#active();
    this.#status.setAttribute('role', 'status'); this.#status.textContent = 'Reading saved data…';
    try {
      const result = await exportDeviceData({ owner: this.owner, version: this.version, signal: controller.signal, current,
        progress: message => { if (current()) this.#status.textContent = message; } });
      if (!current() || controller.signal.aborted) return;
      if (typeof URL.createObjectURL !== 'function') throw new Error('This browser cannot create a device download.');
      const url = URL.createObjectURL(result.blob), link = element('a');
      link.href = url; link.download = `KikiLink-device-data-${this.owner}-${new Date().toISOString().slice(0,10)}.zip`; link.hidden = true; this.element.append(link);
      try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      this.#status.textContent = `Download requested: ${result.files} files, ${result.records} database records. Keep the ZIP private.`;
    } catch (error) {
      if (current()) { this.#status.setAttribute('role', 'alert'); this.#status.textContent = error instanceof Error ? error.message : 'Device export failed. No download was created.'; }
    } finally { if (generation === this.#generation) { this.#controller = undefined; this.#busy(false); } }
  }
}
