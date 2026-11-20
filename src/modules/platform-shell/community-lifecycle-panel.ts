import { element } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';

interface LifecyclePanel {
  body: HTMLElement;
  action?: HTMLButtonElement;
}

interface OwnershipOptions {
  name: string;
  candidates: readonly { memberNumber: number; name: string }[];
  recipient: string;
  confirmation: string;
  loading: boolean;
  error: string;
  disabled: boolean;
  onRecipient(value: string): void;
  onConfirmation(value: string): void;
  onReview(memberNumber: number, confirmation: string): void;
  onMore?: () => void;
  onRetry?: () => void;
  onInvitations(): void;
}

interface ArchiveOptions {
  name: string;
  archived: boolean;
  confirmation: string;
  disabled: boolean;
  onConfirmation(value: string): void;
  onReview(confirmation: string): void;
  onRestore(): void;
}

type LifecycleReviewOptions =
  | { kind: 'ownership'; communityName: string; memberName: string; memberNumber: number }
  | { kind: 'archive' | 'restore'; communityName: string };

function panel(section: 'ownership' | 'archive'): HTMLElement {
  const body = element('section', { className: 'kl-cm-manager-panel kl-cm-lifecycle-panel', ariaLabel: section === 'ownership' ? 'Ownership' : 'Archive' });
  body.dataset.communityManagerPanel = section;
  return body;
}

function button(action: string, text: string, run: () => void, style?: 'primary' | 'danger'): HTMLButtonElement {
  const result = element('button', { type: 'button', className: style ? `kl-text-button kl-text-button--${style}` : 'kl-text-button', text });
  result.dataset.communityAction = action;
  result.addEventListener('click', () => { if (result.isConnected && !result.disabled) run(); });
  return result;
}

function notice(title: string, description: string, warning = false): HTMLElement {
  return element('div', { className: 'kl-cm-lifecycle-notice' + (warning ? ' kl-cm-lifecycle-warning' : '') },
    kikiIcon(warning ? 'warning' : 'info'), element('span', {}, element('strong', { text: title }), ` ${description}`));
}

function note(text: string): HTMLElement {
  return element('p', { className: 'kl-cm-manager-note', text });
}

function facts(values: ReadonlyArray<readonly [string, string]>): HTMLDListElement {
  return element('dl', { className: 'kl-cm-lifecycle-meta' }, ...values.map(([label, value]) =>
    element('div', {}, element('dt', { text: label }), element('dd', { text: value }))));
}

function field(label: string, control: HTMLInputElement | HTMLSelectElement, hint?: string): HTMLElement {
  const help = hint ? element('small', { className: 'kl-cm-field-note', text: hint }) : null;
  if (help) {
    help.id = `kl-${control.dataset.communityField}-hint`;
    control.setAttribute('aria-describedby', help.id);
  }
  return element('label', { className: 'kl-cm-lifecycle-field' },
    element('span', { className: 'kl-cm-field-label', text: label }), control, help);
}

function confirmName(scope: 'owner' | 'archive', value: string, disabled: boolean): HTMLInputElement {
  const input = element('input');
  input.dataset.communityField = `manager-${scope}-confirm`;
  input.value = value;
  input.disabled = disabled;
  input.autocomplete = 'off';
  input.spellcheck = false;
  return input;
}

function submitOnEnter(input: HTMLInputElement, review: HTMLButtonElement): void {
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    review.click();
  });
}

export function renderCommunityOwnership(options: OwnershipOptions): LifecyclePanel {
  const body = panel('ownership');
  const recipient = element('select');
  recipient.dataset.communityField = 'manager-owner-target';
  const placeholder = element('option', { text: 'Choose an existing member' });
  placeholder.value = '';
  recipient.append(placeholder);
  for (const candidate of options.candidates) {
    const choice = element('option', { text: candidate.name });
    choice.value = String(candidate.memberNumber);
    recipient.append(choice);
  }
  recipient.value = options.recipient;
  recipient.disabled = options.disabled || options.loading || !!options.error || options.candidates.length === 0;
  const recipientField = field('New owner', recipient);
  const confirmation = confirmName('owner', options.confirmation, options.disabled);
  const chosen = () => options.candidates.find(candidate => String(candidate.memberNumber) === recipient.value);
  const review = button('manager-transfer-review', 'Review transfer', () => {
    const member = chosen();
    if (!recipient.disabled && member && confirmation.value === options.name) options.onReview(member.memberNumber, confirmation.value);
  }, 'primary');
  const update = () => { review.disabled = recipient.disabled || !chosen() || confirmation.value !== options.name; };
  update();
  recipient.addEventListener('change', () => {
    if (!recipient.isConnected || recipient.disabled) return;
    update();
    options.onRecipient(recipient.value);
  });
  confirmation.addEventListener('input', () => {
    if (!confirmation.isConnected || confirmation.disabled) return;
    update();
    options.onConfirmation(confirmation.value);
  });
  submitOnEnter(confirmation, review);

  body.append(notice('Transfer is immediate after confirmation.', 'The new owner gains all community management permissions. You become an administrator.', true), recipientField);
  if (options.loading) {
    const status = note('Loading members…');
    status.setAttribute('role', 'status');
    body.append(status);
  } else if (options.error) {
    const error = element('p', { className: 'kl-cm-lifecycle-error', text: options.error });
    error.setAttribute('role', 'status');
    body.append(error);
    if (options.onRetry) body.append(button('manager-owner-retry', 'Retry', options.onRetry));
  } else if (!options.candidates.length && !options.onMore) {
    body.append(note('Invite someone and have them join before transferring ownership.'),
      button('manager-owner-invitations', 'Open invitations', options.onInvitations));
  }
  if (options.onMore && !options.loading && !options.error) {
    body.append(button('manager-owner-more', 'More members', options.onMore));
  }

  const role = element('input');
  role.dataset.communityField = 'manager-owner-role';
  role.value = 'Administrator';
  role.readOnly = true;
  body.append(field('Your role after transfer', role, 'Administrators keep routine management. Transfer and archive are reserved for the owner.'),
    note('Independent Space ownership stays with its owner. Access inherited from your community role updates immediately.'),
    field('Type the current community name', confirmation, options.name));
  return { body, action: review };
}

export function renderCommunityArchive(options: ArchiveOptions): LifecyclePanel {
  const body = panel('archive');
  body.dataset.communityArchiveState = options.archived ? 'archived' : 'active';
  if (options.archived) {
    const restore = button('manager-restore', 'Restore community…', options.onRestore, 'primary');
    restore.disabled = options.disabled;
    body.append(notice('Archived community.', 'Channel access and changes to linked Spaces are paused. The current owner can restore the community.'),
      facts([['Status', 'Archived'], ['Restoration', 'Current owner only']]),
      note('Restoring reopens the community with its existing members and settings. Invitations keep their original expiration.'), restore);
    return { body };
  }

  const confirmation = confirmName('archive', options.confirmation, options.disabled);
  const review = button('manager-archive-review', 'Review archive', () => {
    if (!confirmation.disabled && confirmation.value === options.name) options.onReview(confirmation.value);
  }, 'danger');
  const update = () => { review.disabled = confirmation.disabled || confirmation.value !== options.name; };
  update();
  confirmation.addEventListener('input', () => {
    if (!confirmation.isConnected || confirmation.disabled) return;
    update();
    options.onConfirmation(confirmation.value);
  });
  submitOnEnter(confirmation, review);

  const checklist = element('ul', { className: 'kl-cm-lifecycle-checklist' });
  for (const effect of [
    'Existing content is kept under its usual retention rules.',
    'New invitations pause. Pending invitations keep their original expiration.',
    'Channel access and changes to linked events and Spaces pause.',
    'You stay the owner and can restore the community later.',
  ]) checklist.append(element('li', { text: effect }));
  body.append(notice('Pause this community without deleting it.', 'Archiving removes it from discovery and pauses channel access.', true), checklist,
    note('Transfer ownership first if you want to leave the community.'), field('Type the current community name', confirmation, options.name));
  return { body, action: review };
}

export function renderCommunityLifecycleReview(options: LifecycleReviewOptions): HTMLElement {
  const body = element('div', { className: 'kl-cm-lifecycle-review' });
  if (options.kind === 'ownership') {
    body.append(notice('Your permissions change immediately.', 'You become an administrator. Only the new owner can transfer, archive or restore this community.', true),
      facts([['Community', options.communityName], ['New owner', `${options.memberName} · #${options.memberNumber}`], ['Your new role', 'Administrator']]),
      note('The new owner can transfer ownership again. Independently owned Spaces keep their owners.'));
  } else if (options.kind === 'archive') {
    body.append(element('p', {}, element('strong', { text: options.communityName }), ' will be archived.'),
      element('p', { text: 'Channel access and changes to linked events and Spaces pause. Content follows its usual retention rules.' }),
      note('You stay the owner and can restore the community later. Pending invitations keep their original expiration.'));
  } else {
    body.append(element('p', {}, 'Reopen ', element('strong', { text: options.communityName }), ' with its existing members, content and settings.'),
      note('Pending invitations keep their original expiration.'));
  }
  return body;
}
