import type { CloudClient } from '../../cloud/client';
import { communityManagementRead, type ModerationAccess } from '../../cloud/moderation-generation';
import { debounce, element, focusedElement } from '../../utils/dom';
import { iconButton, searchField } from './browse-controls';
import { fitPanelDialog } from './panel-dialog-layout';

interface Invitation {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  membership: string;
  archived: boolean;
}
interface InvitationPage {
  items: Invitation[];
  nextCursor: string | number | null;
}
interface InvitationAccess {
  directory: boolean;
  read: ModerationAccess;
}

/** The inbox uses the authenticated account's existing pending invitation scope. */
export function openCommunityInvitations(root: HTMLElement, client: CloudClient, options: {
  current(): boolean;
  review(id: string): void;
  dismiss(): void;
  closed(): void;
}): () => void {
  const dialog = element('dialog', {
    className: 'kl-cm-design-dialog kl-cm-manager-dialog kl-cm-invitations-dialog',
    ariaLabel: 'Your invitations',
  });
  const form = element('form');
  const input = element('input', { ariaLabel: 'Search invitations' });
  input.type = 'search';
  input.placeholder = 'Search communities…';
  input.maxLength = 80;
  input.dataset.communityField = 'invitation-search';
  const list = element('div', { className: 'kl-cm-manager-list kl-cm-invitations-list' });
  const body = element('div', { className: 'kl-cm-design-body kl-cm-manager-roster' },
    element('p', { className: 'kl-cm-manager-note', text: 'Review pending invitations to join communities.' }),
    element('div', { className: 'kl-cm-manager-toolbar' }, searchField(input, 'Clear invitation search')), list);

  let access: InvitationAccess | undefined;
  let invitations: Invitation[] = [];
  let next: InvitationPage['nextCursor'] = null;
  let request = 0;
  let closed = false;
  let releaseFit: (() => void) | undefined;
  const more = button('more-invitations', 'More invitations', () => {
    if (next !== null && more.getAttribute('aria-disabled') !== 'true') void load(next);
  });
  const current = () => !closed && dialog.open && dialog.isConnected && options.current();
  const searchLater = debounce(() => void load(), 200);

  function close(): void {
    if (closed) return;
    closed = true;
    searchLater.cancel();
    releaseFit?.();
    if (dialog.open) dialog.close();
    dialog.remove();
    options.closed();
  }
  function dismiss(): void {
    const restoreFocus = current();
    close();
    if (restoreFocus) options.dismiss();
  }
  function button(action: string, label: string, run: () => void): HTMLButtonElement {
    const control = element('button', { type: 'button', className: 'kl-text-button', text: label,
      onClick: () => { if (current() && control.isConnected) run(); } });
    control.dataset.communityAction = action;
    return control;
  }
  function showStatus(state: 'loading' | 'error' | 'empty', title: string, detail?: string): HTMLElement {
    const status = element('div', { className: 'kl-cm-invitations-status' },
      element('h3', { text: title }), detail ? element('p', { text: detail }) : null);
    status.setAttribute('role', state === 'error' ? 'alert' : 'status');
    list.dataset.state = state;
    list.replaceChildren(status);
    return status;
  }
  function render(query: string): void {
    if (!invitations.length && next === null) {
      showStatus('empty', query ? 'No invitations match your search' : 'No pending invitations',
        query ? 'Try a different community name.' : 'Communities that invite you will appear here.');
      return;
    }
    list.dataset.state = 'ready';
    list.replaceChildren(...invitations.map(invitation => {
      const review = button(`review-invitation-${invitation.id}`, 'Review', () => {
        if (!access?.read.current()) return;
        close();
        options.review(invitation.id);
      });
      review.setAttribute('aria-label', `Review invitation to ${invitation.name}`);
      return element('article', { className: 'kl-cm-manager-row' },
        element('div', { className: 'kl-cm-manager-row-copy' }, element('strong', { text: invitation.name }),
          element('small', { text: 'Invited you' })),
        element('div', { className: 'kl-cm-invitation-actions' }, element('span', { className: 'kl-cm-role', text: 'Pending' }), review));
    }));
    if (!invitations.length) list.append(element('p', { className: 'kl-cm-manager-note', text: 'More invitations may match your search.' }));
    if (next !== null) list.append(more);
  }
  async function load(cursor: InvitationPage['nextCursor'] = null): Promise<void> {
    if (!current()) return;
    const sequence = ++request;
    const valid = () => current() && sequence === request;
    const query = input.value.trim();
    const previousFocus = focusedElement(dialog);
    if (cursor === null) {
      const focusWasInList = list.contains(previousFocus ?? null);
      invitations = [];
      next = null;
      showStatus('loading', 'Loading invitations…');
      if (focusWasInList) input.focus({ preventScroll: true });
    }
    list.setAttribute('aria-busy', 'true');
    more.setAttribute('aria-disabled', 'true');
    try {
      if (!access) {
        const me = await client.request<{ memberNumber?: number; features?: { communities?: boolean; communityDirectory?: boolean } }>('GET', '/v1/me');
        if (!valid()) return;
        if (!me.features?.communities || me.memberNumber !== undefined && me.memberNumber !== client.memberNumber) {
          showStatus('error', 'Invitations are unavailable', 'Check your KikiLink Cloud connection.');
          return;
        }
        access = { directory: me.features.communityDirectory === true, read: communityManagementRead(client, me) };
      }
      const params = new URLSearchParams({ scope: 'invites' });
      if (access.directory) params.set('q', query);
      params.set('limit', '20');
      if (cursor !== null || !access.directory) params.set('cursor', String(cursor ?? 0));
      const path = access.directory ? '/v1/community-directory' : '/v1/communities';
      const page = await access.read.request<InvitationPage>('GET', `${path}?${params}`);
      if (!valid()) return;
      const lower = query.toLowerCase();
      const seen = new Set(invitations.map(invitation => invitation.id));
      for (const invitation of page.items) {
        if (invitation.membership !== 'invited' || invitation.archived || seen.has(invitation.id) ||
          !access.directory && lower && !`${invitation.name} ${invitation.description} ${invitation.tags?.join(' ') ?? ''}`.toLowerCase().includes(lower)) continue;
        invitations.push(invitation);
        seen.add(invitation.id);
      }
      next = page.nextCursor === cursor ? null : page.nextCursor ?? null;
      const keepMore = previousFocus === more && focusedElement(dialog) === more;
      render(query);
      if (keepMore) (next === null ? input : more).focus({ preventScroll: true });
    } catch {
      if (!valid()) return;
      const wasFocused = list.contains(focusedElement(dialog) ?? null);
      access = undefined;
      invitations = [];
      next = null;
      const error = showStatus('error', 'We couldn’t load invitations', 'Give the connection another try.');
      const retry = button('retry-invitations', 'Retry', () => void load());
      error.append(retry);
      if (wasFocused) retry.focus({ preventScroll: true });
    } finally {
      if (valid()) {
        list.setAttribute('aria-busy', 'false');
        more.removeAttribute('aria-disabled');
      }
    }
  }

  const cross = iconButton('Close dialog', 'close', dismiss);
  cross.dataset.communityAction = 'close-invitations';
  form.append(element('header', {}, element('div', { className: 'kl-cm-design-title' },
    element('span', { text: 'KIKILINK' }), element('h2', { text: 'Your invitations' })), cross),
    body, element('footer', {}, button('dismiss-invitations', 'Close', dismiss)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    searchLater.cancel();
    void load();
  });
  input.addEventListener('input', () => {
    request++;
    showStatus('loading', 'Loading invitations…');
    list.setAttribute('aria-busy', 'true');
    searchLater();
  });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX >= bounds.right || event.clientY < bounds.top || event.clientY >= bounds.bottom) dismiss();
  });
  dialog.append(form);
  root.append(dialog);
  dialog.showModal();
  releaseFit = fitPanelDialog(dialog);
  cross.focus({ preventScroll: true });
  void load();
  return close;
}
