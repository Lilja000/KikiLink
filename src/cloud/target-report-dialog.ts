import type { CloudClient } from './client';
import { element } from './dom';
import { moderationDialog } from './moderation-dialog';
import { reportForm } from './report-form';
import type { ReportSource } from './report-source';

/** A report on a known item shares the same form and explicit draft exit in each surface. */
export function targetReportDialog(client: CloudClient, options: {
  type: string;
  id: string;
  title: string;
  label: string;
  summary: string;
  context?: string;
  notice: string;
  structured: boolean;
  endpoint?: string;
  source?: ReportSource | undefined;
  sourceKey?: string;
  panel?: HTMLElement | undefined;
  presentation?: 'channel-message';
  current(): boolean;
  close(): void;
  submitted(id: number): void;
  state?(value: {busy: boolean; pending: boolean; dirty: boolean}): void;
}): HTMLDialogElement {
  const target = element('div', { className: 'kl-mod-report-target' },
    element('span', { className: 'kl-mod-badge', text: options.label }),
    element('strong', { text: options.summary }),
    options.context ? element('small', { text: options.context }) : undefined);
  const body = element('div', { className: 'kl-mod-dialog-body' }, target);
  const footer = element('footer', { className: 'kl-mod-dialog-footer' });
  const channelMessage = options.presentation === 'channel-message';
  const discardHeading = element('strong', {text:'Discard your unsaved report?'});
  const discardMessage = element('p');
  const discard = element('section', { className: 'kl-mod-notice', hidden: true }, discardMessage);
  const keep = element('button', { type: 'button', className: 'kl-text-button', text: 'Keep editing' });
  const drop = element('button', { type: 'button', className: 'kl-text-button', text: 'Discard report' });
  let state = { busy: false, pending: false, dirty: false };
  const current = () => dialog.open && options.current();
  const cancel = () => {
    if (!current() || state.busy) return;
    if (!state.dirty) { options.close(); return; }
    discardHeading.textContent = state.pending ? 'Close this report?' : 'Discard your unsaved report?';
    discardMessage.textContent = state.pending
      ? 'Your report may already have been received. Close without retrying?' : channelMessage ? 'These changes have not been saved.' : 'Discard this report draft?';
    discard.hidden = false;
    keep.focus();
  };
  const form = reportForm(client, options.type, options.id, options.structured, id => {
    footer.replaceChildren();
    discard.hidden = true;
    options.submitted(id);
  }, cancel, options.endpoint, {
    source: options.source, ...(options.sourceKey ? {sourceKey:options.sourceKey}:{}), compact: true, current,
    ...(options.presentation ? {presentation:options.presentation}:{}),
    state: next => {
      state = next;
      dialog.querySelector('header button')?.toggleAttribute('disabled', state.busy);
      keep.disabled = drop.disabled = state.busy;
      options.state?.(next);
    },
  });
  keep.addEventListener('click', () => {
    if (!current() || state.busy) return;
    discard.hidden = true;
    const reason = channelMessage ? form.querySelector<HTMLSelectElement>('select') : null;
    const editor = reason && !reason.disabled && !reason.closest('fieldset')?.disabled
      ? reason : form.querySelector('textarea');
    editor?.focus();
  });
  drop.addEventListener('click', () => { if (current() && !state.busy) options.close(); });
  if(channelMessage){
    discard.prepend(discardHeading);
    discard.setAttribute('role','alert');
    keep.classList.add('kl-text-button--primary');
    drop.classList.add('kl-report-discard');
    discard.append(element('div', {className:'kl-report-discard-actions'},keep,drop));
  }else discard.append(keep, drop);
  footer.append(form.querySelector('.kl-cloud-actions')!);
  const notice = element('p', { className: 'kl-mod-note', text: options.notice });
  if (channelMessage) {
    form.querySelector('.kl-cloud-status')!.before(notice);
    body.append(form);
  } else body.append(form, notice, discard);
  const dialog = moderationDialog(options.title, body, footer, cancel, options.panel);
  dialog.classList.add('kl-report-dialog', 'kl-mod-report-dialog');
  if (channelMessage) {
    dialog.classList.add('kl-cm-message-report-dialog');
    dialog.append(element('div', {className:'kl-report-discard-area'},discard));
  }
  dialog.querySelector('header button')?.setAttribute('aria-label', 'Close report');
  return dialog;
}
