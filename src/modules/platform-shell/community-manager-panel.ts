import { markAvatarPresence } from "../link-chat/avatar-presence";
import { bindClockText } from '../../core/time-format';
import { element } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import { searchField } from './browse-controls';

type Section = 'members' | 'invitations' | 'requests';

interface ManagerMember {
  memberNumber: number;
  displayName: string;
  username?: string | null;
  avatar?: HTMLElement;
  roleLabel: string;
  status?: string;
  updatedAt?: number;
  protectedRole?: boolean;
  openProfile?: () => void;
  controls?: HTMLElement;
}

export interface CommunityManagerPanelOptions {
  section: Section;
  members: readonly ManagerMember[];
  loading: boolean;
  error: string;
  search: string;
  role: string;
  online: boolean;
  filterAvailable: boolean;
  filter: (search: string, role: string, online: boolean) => void;
  more?: () => void;
  retry?: () => void;
  invite?: (memberNumber: number) => void;
  recipient: string;
  recipientChanged: (value: string) => void;
  openModeration?: () => void;
  ownMember?: number;
}

const sectionLabels: Record<Section, string> = { members: 'Members', invitations: 'Invitations', requests: 'Requests' };

function action(id: string, label: string, run: () => void, primary = false): HTMLButtonElement {
  const button = element('button', { type: 'button', className: primary ? 'kl-text-button kl-text-button--primary' : 'kl-text-button', text: label });
  button.dataset.communityAction = id;
  button.addEventListener('click', () => { if (button.isConnected && !button.disabled) run(); });
  return button;
}

function toolbar(options: CommunityManagerPanelOptions): HTMLElement {
  const tools = element('div', { className: 'kl-cm-manager-toolbar' });
  if (options.filterAvailable) {
    const search = element('input', { ariaLabel: 'Search members' });
    search.type = 'search';
    search.placeholder = 'Search names or roles…';
    search.maxLength = 80;
    search.value = options.search;
    search.dataset.communityField = 'manager-member-search';
    const role = element('select', { ariaLabel: 'Filter member roles' });
    role.dataset.communityField = 'manager-member-role';
    for (const [value, label] of [['', 'All roles'], ['owner', 'Owner'], ['admin', 'Administrator'], ['moderator', 'Moderator'], ['member', 'Member']] as const) {
      const choice = element('option', { text: label });
      choice.value = value;
      role.append(choice);
    }
    role.value = options.role;
    const apply = () => { if (search.isConnected) options.filter(search.value, role.value, options.online); };
    search.addEventListener('input', apply);
    search.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
    role.addEventListener('change', apply);
    const online = action('manager-members-online', 'Online now', () => options.filter(search.value, role.value, !options.online));
    online.setAttribute('aria-pressed', String(options.online));
    tools.append(searchField(search, 'Clear member search'), role, online);
  }
  if (options.openModeration) tools.append(action('manager-moderation', 'Moderation queue', options.openModeration));
  return tools;
}

function inviteForm(options: CommunityManagerPanelOptions, invite: (memberNumber: number) => void): HTMLElement {
  const recipient = element('input', { ariaLabel: 'Member Number' });
  recipient.type = 'text';
  recipient.inputMode = 'numeric';
  recipient.autocomplete = 'off';
  recipient.maxLength = 16;
  recipient.dataset.communityField = 'manager-member-number';
  recipient.value = options.recipient;
  const memberNumber = () => {
    const value = recipient.value.trim();
    const number = Number(value);
    return /^\d+$/u.test(value) && Number.isSafeInteger(number) && number > 0 && number !== options.ownMember ? number : undefined;
  };
  const send = action('manager-invite', 'Send invitation', () => {
    const number = memberNumber();
    if (number !== undefined) invite(number);
  }, true);
  const update = () => { send.disabled = options.loading || !!options.error || memberNumber() === undefined; };
  update();
  recipient.addEventListener('input', () => {
    if (!recipient.isConnected) return;
    options.recipientChanged(recipient.value);
    update();
  });
  recipient.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    send.click();
  });
  return element('section', { className: 'kl-cm-manager-invite' },
    element('h3', { text: 'Invite someone' }),
    element('p', { className: 'kl-cm-manager-note', text: 'Enter the Member Number of the person you want to invite.' }),
    element('label', {}, element('span', { text: 'Member Number' }), recipient), send);
}

function row(member: ManagerMember, section: Section, ownMember?: number): HTMLElement {
  const memberRow = section === 'members';
  const own = member.memberNumber === ownMember;
  const title = own && memberRow ? `${member.displayName} · You` : member.displayName;
  const identity = element('div', { className: 'kl-cm-manager-person' });
  if (memberRow) {
    const initials = member.displayName.trim().split(/\s+/u).slice(0, 2).map(word => [...word][0] ?? '').join('').toUpperCase();
    const avatar = element('span', { className: 'kl-cm-manager-avatar' }, member.avatar ?? initials);
    avatar.setAttribute('aria-hidden', 'true');
    identity.append(markAvatarPresence(avatar, member.memberNumber, member.status ?? null));
  }
  const details = [`#${member.memberNumber}`, member.username ? `@${member.username}` : '', memberRow ? member.roleLabel : 'Pending', memberRow ? member.status ?? '' : ''].filter(Boolean);
  const copy = element('div', { className: 'kl-cm-manager-row-copy' },
    element('strong', { text: title }), element('small', {}, details.join(' · ')));
  if (!memberRow && typeof member.updatedAt === 'number' && member.updatedAt > 0 && Number.isFinite(new Date(member.updatedAt).getTime())) {
    copy.append(bindClockText(element('time'), member.updatedAt, 'medium-date-time'));
  }
  identity.append(copy);
  const actions = element('div', { className: 'kl-cm-manager-row-actions' });
  if (member.openProfile) actions.append(action(`profile-${member.memberNumber}`, 'Profile', member.openProfile));
  if (member.controls) actions.append(...Array.from(member.controls.children));
  if (memberRow && member.protectedRole) actions.append(element('span', {
    className: member.roleLabel === 'Owner' ? 'kl-cm-role kl-cm-role--gold' : 'kl-cm-role',
    text: member.roleLabel === 'Owner' ? 'Owner' : own ? 'Your membership' : 'Protected role',
  }));
  if (section === 'invitations') actions.prepend(element('span', { className: 'kl-cm-role', text: 'Pending' }));
  const result = element('article', { className: 'kl-cm-manager-row' }, identity, actions.childElementCount ? actions : null);
  result.dataset.communityMember = String(member.memberNumber);
  return result;
}

function empty(title: string, description: string, icon: 'users' | 'send' | 'warning' = 'users'): HTMLElement {
  return element('section', { className: 'kl-cm-manager-empty' }, kikiIcon(icon), element('h3', { text: title }),
    element('p', { text: description }));
}

export function renderCommunityManagerPanel(options: CommunityManagerPanelOptions): HTMLElement {
  const { section } = options;
  const panel = element('section', { className: 'kl-cm-manager-panel kl-cm-manager-roster', ariaLabel: sectionLabels[section] });
  panel.dataset.communityManagerPanel = section;
  if (section === 'members' && (options.filterAvailable || options.openModeration)) panel.append(toolbar(options));
  if (section === 'invitations') {
    if (options.invite) panel.append(inviteForm(options, options.invite));
    panel.append(element('h3', { className: 'kl-cm-manager-list-title', text: 'Pending invitations' }));
  }
  if (section === 'requests') panel.append(element('p', { className: 'kl-cm-manager-note', text: 'Approve or decline requests to join this community.' }));
  const list = element('div', { className: 'kl-cm-manager-list' });
  list.setAttribute('aria-busy', String(options.loading));
  if (options.error) {
    const state = empty(`${sectionLabels[section]} could not load`, options.error, 'warning');
    if (options.retry) state.append(action('manager-retry', 'Retry', options.retry));
    list.append(state);
  } else if (options.members.length) {
    list.append(...options.members.map(member => row(member, section, options.ownMember)));
  } else if (!options.loading) {
    if (section === 'members') {
      const filtered = !!(options.search.trim() || options.role || options.online);
      list.append(empty(filtered ? 'No matching members' : 'No members in this view', filtered ? 'Try another name or role, or clear your filters.' : 'Members will appear here when available.'));
    } else if (section === 'invitations') {
      list.append(empty('No pending invitations', 'New invitations appear here while they await a response.', 'send'));
    } else {
      list.append(empty('No join requests', 'New requests appear here when someone asks to join.'));
    }
  }
  if (options.loading) {
    const status = element('p', { className: 'kl-cm-manager-note', text: `Loading ${sectionLabels[section].toLowerCase()}…` });
    status.setAttribute('role', 'status');
    list.append(status);
  }
  panel.append(list);
  if (options.more && !options.error) {
    const label = section === 'members' ? 'More members' : section === 'invitations' ? 'More invitations' : 'More requests';
    const more = action('manager-more', label, options.more);
    more.disabled = options.loading;
    panel.append(more);
  }
  if (section === 'members' && !options.error && options.members.length) panel.append(element('p', {
    className: 'kl-cm-manager-note', text: 'Owners appoint administrators. Administrators manage moderators and members. Your own role is protected.',
  }));
  return panel;
}
