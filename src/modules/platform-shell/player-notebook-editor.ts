import { element } from '../../utils/dom';
import type { ContentDialog } from '../link-chat/content-dialog';
import { fitPanelDialog } from './panel-dialog-layout';

export function openPlayerNotebookEditor(dialog: ContentDialog, panel: HTMLElement, options: {
  mode: 'note' | 'tags';
  name: string;
  current(): boolean;
  read(): string;
  save(value: string): void;
}): void {
  const note = options.mode === 'note';
  const baseline = options.read();
  const field = note ? element('textarea') : element('input');
  field.value = baseline;
  field.maxLength = Math.max(note ? 1000 : 200, baseline.length);
  if (field instanceof HTMLTextAreaElement) field.rows = 7;
  else field.placeholder = 'Writing, coffee, creative';
  const hint = element('small', { className: 'kl-player-editor-hint' });
  const count = () => { hint.textContent = note ? field.value.length + '/' + field.maxLength : 'Up to 8 comma-separated tags.'; };
  field.addEventListener('input', count); count();
  const status = element('p', { className: 'kl-cloud-status' }); status.setAttribute('role', 'status');
  const label = element('label', { className: 'kl-player-editor-field' }, element('span', { text: note ? 'Note' : 'Tags' }), field, hint);
  const button = (name: string, run: () => void, primary = false) => element('button', {
    type: 'button', text: name, className: 'kl-text-button' + (primary ? ' kl-text-button--primary' : ''), onClick: run,
  });
  const close = () => dialog.close();
  const discard = element('div', { className: 'kl-player-editor-discard' },
    element('strong', { text: 'Discard changes?' }), button('Keep editing', () => {
      discard.hidden = true; label.hidden = footer.hidden = false; field.focus();
    }), button('Discard', close));
  discard.hidden = true;
  function dismiss() {
    if (!options.current() || field.value === baseline) { close(); return; }
    label.hidden = footer.hidden = true; discard.hidden = false;
    discard.querySelector('button')?.focus();
  }
  function save() {
    if (!form.isConnected || !dialog.element.open || !options.current()) { close(); return; }
    if (options.read() !== baseline) { status.textContent = 'This entry changed. Reopen it to see the latest version.'; return; }
    if (!note) {
      const tags = field.value.split(',').map(value => value.trim()).filter(Boolean);
      if (tags.length > 8 || tags.some(tag => tag.length > 24)) { status.textContent = 'Use up to 8 tags, each within 24 characters.'; return; }
    }
    try { options.save(field.value); close(); }
    catch { status.textContent = 'Could not save on this device. Your changes are still open.'; }
  }
  const footer = element('footer', { className: 'kl-dialog-actions' }, button('Cancel', dismiss), button('Save', save, true));
  const form = element('div', { className: 'kl-player-notebook-editor' }, label, status, discard, footer);
  let release: (() => void) | undefined;
  const previousStyle = ['inset', 'max-width', 'max-height', '--kl-dialog-viewport-height'].map(key =>
    [key, dialog.element.style.getPropertyValue(key)] as const);
  const cleanup = () => {
    release?.();
    dialog.element.classList.remove('kl-player-editor-dialog');
    delete dialog.element.dataset.playerEditorCompact;
    for (const [key, value] of previousStyle) dialog.element.style.setProperty(key, value);
  };
  dialog.show((note ? 'Private note' : 'Private tags') + ' · ' + options.name, form, cleanup, dismiss);
  dialog.element.classList.add('kl-player-editor-dialog');
  release = fitPanelDialog(dialog.element, { panel, layout: (width, height) => {
    dialog.element.dataset.playerEditorCompact = String(width <= 700 || width <= 900 && height <= 500);
    return { marginX: 12, marginY: 12 };
  } });
  field.focus();
}
