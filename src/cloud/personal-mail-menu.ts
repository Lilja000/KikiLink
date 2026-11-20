import type { ContentDialog } from '../modules/link-chat/content-dialog';
import { kikiIcon } from '../modules/link-chat/icons';
import type { ShellActionMenu } from '../modules/platform-shell/action-menu';
import { element } from './dom';

export interface PersonalMailDialogs { menu: ShellActionMenu; dialog: ContentDialog }
interface Options {
  subject: string;
  read: boolean;
  dialogs?: PersonalMailDialogs | undefined;
  current(): boolean;
  setRead(read: boolean): Promise<void>;
  remove(): Promise<void>;
  notify(message: string): void;
}

export function personalMailOptions(options: Options): HTMLButtonElement {
  const { dialogs } = options;
  const trigger = element('button', { type: 'button', className: 'kl-text-button kl-mailbox-icon-button', ariaLabel: `Options for ${options.subject}` }, kikiIcon('more'));
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.disabled = !dialogs;
  let busy = false;
  const available = () => !busy && trigger.isConnected && options.current();
  const toggleRead = async () => {
    if (!available()) return;
    busy = true;
    try { await options.setRead(!options.read); }
    catch { if (options.current()) options.notify('The read status could not be updated. Try again.'); }
    finally { busy = false; }
  };
  const confirmRemoval = () => {
    if (!dialogs || !available()) return;
    const { dialog } = dialogs;
    const cancel = element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel' });
    const remove = element('button', { type: 'button', className: 'kl-text-button kl-text-button--danger', text: 'Remove item' });
    const status = element('p', { role: 'status', className: 'kl-field-note', hidden: true });
    const content = element('div', { className: 'kl-personal-mail-confirm' },
      element('p', { text: 'Remove this letter from your mailbox? Your conversation history stays available.' }), status,
      element('footer', { className: 'kl-dialog-actions' }, cancel, remove));
    const showing = () => dialog.element.open && dialog.body.contains(content);
    cancel.addEventListener('click', () => { if (showing()) dialog.close(); });
    remove.addEventListener('click', async () => {
      if (!showing() || !options.current() || busy) return;
      busy = remove.disabled = true;
      status.hidden = true;
      try {
        await options.remove();
        if (showing() && options.current()) { dialog.close(); options.notify('Mailbox item removed.'); }
      } catch {
        if (showing() && options.current()) { status.textContent = 'The letter could not be removed. Try again.'; status.hidden = false; }
      } finally { busy = remove.disabled = false; }
    });
    dialog.show('Remove this mailbox item?', content);
    cancel.focus();
  };
  trigger.addEventListener('click', () => {
    if (!dialogs || !available()) return;
    dialogs.menu.open(trigger, 'Mailbox options', [
      { label: options.read ? 'Mark as unread' : 'Mark as read', icon: 'read-all', run: () => void toggleRead() },
      { label: 'Remove from mailbox…', icon: 'trash', danger: true, run: confirmRemoval },
    ], undefined, true);
  });
  return trigger;
}
