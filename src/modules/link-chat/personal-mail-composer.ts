import { CloudError } from '../../cloud/client';
import { element } from '../../cloud/dom';
import type { MailboxAccess } from '../../cloud/mailbox-recovery';
import type { ContentDialog } from './content-dialog';

interface ComposeOptions {
  dialog: ContentDialog;
  access: MailboxAccess;
  recipient: number;
  name: string;
  allowed(): boolean;
  subscribe(listener: () => void): () => void;
  sent(): void;
}

export function openPersonalMailComposer(options: ComposeOptions): void {
  const { dialog, access, recipient } = options;
  const allowed = () => access.current() && options.allowed();
  if (!allowed()) return;
  const subject = element('input', { className: 'kl-search', type: 'text', maxLength: 120 });
  const body = element('textarea', { className: 'kl-personal-mail-body-input', maxLength: 2000 });
  body.rows = 6;
  subject.required = body.required = true;
  const status = element('p', { className: 'kl-field-note', role: 'status', hidden: true });
  const send = element('button', { type: 'submit', className: 'kl-text-button kl-text-button--primary', text: 'Send letter' });
  const cancel = element('button', { type: 'button', className: 'kl-text-button', text: 'Cancel' });
  const form = element('form', { className: 'kl-personal-mail-compose' },
    element('p', { className: 'kl-field-note', text: `To ${options.name} (#${recipient})` }),
    element('label', { className: 'kl-presence-field' }, element('span', { className: 'kl-presence-field-label', text: 'Subject' }), subject),
    element('label', { className: 'kl-presence-field' }, element('span', { className: 'kl-presence-field-label', text: 'Message' }), body),
    status, element('footer', { className: 'kl-dialog-actions' }, cancel, send));
  const current = () => dialog.element.open && dialog.body.contains(form);
  let busy = false;
  let receiptUncertain = false;
  let pending: { recipient: number; subject: string; body: string; operationId: string } | undefined;
  const update = () => {
    send.disabled = busy || !subject.value.trim() || !body.value.trim() || !allowed();
    subject.readOnly = body.readOnly = !!pending;
    send.textContent = busy ? 'Sending…' : pending ? 'Retry send' : 'Send letter';
  };
  cancel.addEventListener('click', () => { if (current()) dialog.close(); });
  form.addEventListener('input', update);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!current() || !allowed() || busy || send.disabled) return;
    const attempt = pending ?? { recipient, subject: subject.value.trim(), body: body.value.trim(), operationId: crypto.randomUUID() };
    pending = attempt;
    busy = true;
    status.hidden = true;
    update();
    try {
      const receipt = await access.request<{ id: number; recipient: number; operationId: string; targetId: string }>('POST', '/v1/mailbox/letters', attempt);
      if (!current() || !allowed()) return;
      if (!Number.isSafeInteger(receipt?.id) || receipt.id <= 0 || receipt.operationId !== attempt.operationId ||
        receipt.recipient !== recipient || !receipt.targetId) throw new Error('unconfirmed');
      dialog.close();
      options.sent();
    } catch (error) {
      if (!current()) return;
      if (!allowed()) { dialog.close(); return; }
      const refused = error instanceof CloudError && [400, 401, 403, 404, 413, 422, 429].includes(error.status);
      if (!refused) receiptUncertain = true;
      // A later rejection cannot rule out delivery of a previous attempt whose reply was lost.
      if (refused && !receiptUncertain) pending = undefined;
      status.textContent = error instanceof CloudError && error.status === 429 ? 'Too many letters. Try again later.'
        : refused && !receiptUncertain ? 'Cloud could not send this letter. Check that you can still message this contact.'
        : 'Delivery could not be confirmed. Retry to check this same letter.';
      status.hidden = false;
    } finally { busy = false; if (current()) update(); }
  });
  let unsubscribe: (() => void) | undefined;
  dialog.show('Write a letter', form, () => unsubscribe?.());
  unsubscribe = options.subscribe(() => { if (current() && !allowed()) dialog.close(); });
  update();
  subject.focus();
}
