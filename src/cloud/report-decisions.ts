import { element } from './dom';
import { bindClockText } from '../core/time-format';
import type { TriageReport } from './report-triage';
import { moderationDialog } from './moderation-dialog';

export interface DecisionEntry { id: number; action: string; moderator: number; note: string; createdAt: number; targetType?: string; targetId?: string; reportId?: number | null }
export interface DecisionReview extends TriageReport { canReopen: boolean; history: { items: DecisionEntry[]; nextCursor: number | null } }
export type ReportAction = 'warn' | 'remove' | 'dismiss' | 'reopen';
export interface DecisionRequest { operationId: string; revision: number; action: ReportAction; reason: string }
export interface DecisionDraft { action: ReportAction; reason: string; confirm: boolean; open: boolean; discard?: boolean; pending?: DecisionRequest }
export const newDecisionDraft = (): DecisionDraft => ({ action: 'dismiss', reason: '', confirm: false, open: false });
export const decisionName = (action: string): string => ({warn:'Warning issued',remove:'Content removed',dismiss:'Report dismissed',reopen:'Report reopened'}[action.replace(/^report_/, '')] ?? action.replaceAll('_',' '));

export function decisionHistory(items: DecisionEntry[]): HTMLElement {
  const section = element('section', { className: 'kl-mod-evidence kl-mod-history', ariaLabel: 'Decision history' }, element('h2', { text: 'Decision history' }));
  if (!items.length) section.append(element('p', { className: 'kl-mod-note', text: 'No decisions recorded for this report yet.' }));
  for (const entry of items) section.append(element('article', { className: 'kl-mod-row' }, element('div', { className: 'kl-mod-main' },
    element('h3', { text: decisionName(entry.action) }), ...(entry.targetType ? [element('p', { className: 'kl-mod-note', text: `${entry.targetType} #${entry.targetId}${entry.reportId ? ` · Report #${entry.reportId}` : ''}` })] : []), element('p', { className: 'kl-mod-copy', text: entry.note || 'No note added.' }),
    element('small', { text: `Moderator #${entry.moderator} · ` }), bindClockText(element('time'), entry.createdAt, 'numeric-date-time'))));
  return section;
}

/** Shared rendering only. Hosts retain request identity and clear data on access loss. */
export function decisionControls(review: DecisionReview, draft: DecisionDraft, options: {
  available: boolean; initialAction?: 'warn' | 'dismiss'; communityTarget?: boolean; spaceTarget?: boolean; workshopTarget?: 'creation'|'review'|undefined; disabled: boolean;
  button(label: string, run: () => void, primary?: boolean): HTMLButtonElement;
  render(): void; submit(): void; target: { title: string; type: string; reference: string };
}): HTMLElement {
  const section = element('section', { className: 'kl-mod-actions' });
  const closed = review.status !== 'open';
  if (closed && !review.canReopen && !draft.pending) {
    section.append(element('p', { className: 'kl-mod-note', text: 'This report is read-only. Reopening requires available content and no newer open report.' }));
    return section;
  }
  const initial = closed ? 'reopen' : options.available ? options.initialAction ?? 'dismiss' : 'dismiss';
  const launch = options.button(closed ? 'Reopen report…' : 'Review decision…', () => {
    draft.action = initial;
    draft.open = true;
    draft.confirm = closed;
    options.render();
  }, true);
  launch.dataset.decisionTrigger = 'true';
  section.append(launch);
  if (!draft.open && !draft.pending) return section;
  launch.disabled = true;

  const body = element('div', { className: 'kl-mod-decision kl-mod-dialog-body' });
  const target = element('div', { className: 'kl-mod-report-target kl-mod-decision-target' },
    element('span', { className: 'kl-mod-badge', text: options.target.type }),
    element('strong', { text: options.target.title }), element('small', { text: options.target.reference }));
  const footer = element('footer', { className: 'kl-mod-actions kl-mod-dialog-footer' });
  const removeLabel = options.communityTarget ? 'Restrict community' : options.spaceTarget ? 'Restrict Space' : 'Remove content';
  const labels = { warn: 'Warn', remove: removeLabel, dismiss: 'Dismiss report', reopen: 'Reopen report' };
  const warning = draft.action === 'warn';
  const required = warning || draft.action === 'remove';
  const explanation = warning ? 'The warning is visible to the content author. This closes the report and keeps the content.'
    : draft.action === 'reopen' ? 'Reopen this report and clear its assignment? Earlier decisions stay in the history. Removed content is not restored.'
    : draft.action === 'dismiss' ? 'Dismiss this report without removing content. This note stays with the moderation team.'
    : options.communityTarget ? 'Restrict the community and close its open reports? Activity pauses until the restriction is lifted.'
    : options.spaceTarget ? 'Restrict access to this Space and close its open reports? Its saved settings and other retained content are kept.'
    : options.workshopTarget === 'creation' ? 'Remove server access to this creation and all its versions, prevent republishing and close its open reports? Existing local copies are kept; published versions are retained.'
    : options.workshopTarget === 'review' ? 'Delete this rating and review, prevent the same author from reposting it on this creation and close its open reports? The deleted text and rating cannot be restored.'
    : 'Remove this content and its attachments for everyone? All open reports for it will be closed.';
  const close = () => {
    const host = section.closest('.kl-cm-moderation,.kl-platform-moderation') ?? section.parentElement;
    Object.assign(draft, newDecisionDraft(), { discard: false });
    options.render();
    queueMicrotask(() => host?.querySelector<HTMLButtonElement>('[data-decision-trigger]')?.focus());
  };
  const cancel = () => {
    if (!section.isConnected || options.disabled || draft.pending) return;
    if (!draft.reason && draft.action === initial) { close(); return; }
    draft.discard = true;
    body.inert = true;
    for (const button of normalButtons) button.hidden = true;
    discardNotice.hidden = keep.hidden = discard.hidden = false;
    keep.focus();
  };
  const discardNotice = element('p', { className: 'kl-mod-notice kl-mod-decision-discard', role: 'alert', text: 'Discard your unsaved decision?', hidden: true });
  const keep = options.button('Keep editing', () => {
    if (!draft.discard) return;
    draft.discard = false;
    body.inert = false;
    for (const button of normalButtons) button.hidden = false;
    discardNotice.hidden = keep.hidden = discard.hidden = true;
    (body.querySelector('textarea') ?? normalButtons[0])?.focus();
  }, true);
  const discard = options.button('Discard changes', () => { if (draft.discard) close(); });
  keep.hidden = discard.hidden = true;
  if (draft.confirm || draft.pending) {
    body.append(element('div', { className: 'kl-mod-decision-summary' }, target, element('h3', { text: labels[draft.action] }),
      element('p', { className: 'kl-mod-copy', text: draft.reason || 'No note added.' }),
      element('p', { className: 'kl-mod-note', text: explanation })));
    if (draft.pending) {
      body.append(element('p', { role: 'status', text: options.disabled ? 'Saving decision…' : 'Decision not confirmed. Retry sends the same decision.' }));
      footer.append(options.button('Retry decision', options.submit, true));
    } else {
      footer.append(closed ? options.button('Cancel', cancel) : options.button('Back to decision', () => { if (!draft.discard) { draft.confirm = false; options.render(); } }),
        options.button('Confirm decision', () => { if (!draft.discard) options.submit(); }, true));
    }
  } else {
    const select = element('select', { ariaLabel: 'Decision' });
    const choices: ReportAction[] = options.available ? (options.initialAction === 'warn' ? ['warn', 'remove', 'dismiss'] : ['dismiss', 'warn', 'remove']) : ['dismiss'];
    for (const action of choices) select.append(element('option', { value: action, text: labels[action] }));
    select.value = draft.action;
    select.disabled = options.disabled;
    select.addEventListener('change', () => {
      if (!section.isConnected || select.disabled || draft.discard || select.value === draft.action) return;
      // Warnings go to the author. Private moderator notes must never become warning messages.
      if ((select.value === 'warn') !== warning) draft.reason = '';
      draft.action = select.value as ReportAction;
      options.render();
    });
    const reason = element('textarea', { ariaLabel: warning ? 'Warning message' : 'Decision reason', maxLength: 500, value: draft.reason,
      placeholder: warning ? 'A message for the content author' : required ? 'Explain your decision' : 'Optional private note' });
    reason.required = required;
    reason.disabled = options.disabled;
    const counter = element('small', { className: 'kl-report-counter' });
    const validation = element('div', { className: 'kl-mod-decision-validation', role: 'status' });
    validation.id = 'kl-mod-decision-status-' + crypto.randomUUID();
    const hint = element('small', { className: 'kl-mod-note', text: warning ? 'The author can read this warning in My reports → Warnings.' : explanation });
    hint.id = validation.id + '-hint';
    reason.setAttribute('aria-describedby', hint.id + ' ' + validation.id);
    const advance = options.button('Continue', () => {
      if (advance.disabled || draft.discard) return;
      draft.confirm = true;
      options.render();
    }, true);
    const validate = () => {
      counter.textContent = `${draft.reason.length}/500`;
      const error = draft.reason.length > 500 ? 'Keep the decision note within 500 characters.'
        : required && !draft.reason.trim() ? (warning ? 'Add a warning message for the author.' : 'Add a note explaining this decision.') : '';
      advance.disabled = options.disabled || Boolean(error);
      const message = error || 'Ready for the next step.';
      if (validation.textContent !== message) {
        validation.dataset.valid = String(!error);
        if (error) validation.replaceChildren(element('ul', {}, element('li', { text: error })));
        else validation.textContent = message;
      }
    };
    reason.addEventListener('input', () => {
      if (!section.isConnected || reason.disabled || draft.discard) return;
      draft.reason = reason.value;
      validate();
    });
    validate();
    body.append(target, element('label', {}, element('span', { text: 'Decision' }), select),
      element('label', {}, element('span', { text: warning ? 'Warning message' : required ? 'Private decision note' : 'Private note (optional)' }), reason),
      element('div', { className: 'kl-mod-decision-meta' }, hint, counter), validation);
    footer.append(options.button('Cancel', cancel), advance);
  }
  const normalButtons = Array.from(footer.querySelectorAll('button'));
  footer.append(discardNotice, keep, discard);
  if (draft.discard) {
    body.inert = true;
    for (const button of normalButtons) button.hidden = true;
    discardNotice.hidden = keep.hidden = discard.hidden = false;
    keep.setAttribute('autofocus', '');
  }
  const dialog = moderationDialog(draft.confirm ? 'Confirm decision' : 'Review a decision', body, footer, cancel);
  dialog.classList.add('kl-mod-decision-dialog');
  section.append(dialog);
  return section;
}
