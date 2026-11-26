import { sectionLink } from './section-link';
import { markAvatarPresence } from "../link-chat/avatar-presence";
import { spaceAppearance, type SpaceColor, type SpaceIcon } from '../../../cloud/shared/space-appearance.mjs';
import { bindClockText } from '../../core/time-format';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { communityIcon } from './community-design';
import type { DiscoverCommunity } from './discover-communities';
import type { DiscoverEventSummary } from './discover-events';
import { eventPreviewBadge } from './event-badges';
import { eventClockContext } from './event-time';
import { workshopTypeIcons, type WorkshopType } from './workshop-model';

export type DiscoverAction = 'events' | 'communities' | 'people' | 'rooms' | 'matches' | 'workshop' | 'plans' | 'my-plans' | 'create-event';
type UpcomingStatus = 'loading' | 'unavailable' | 'offline' | 'more' | 'error';

interface DiscoverEvent extends DiscoverEventSummary {
  open(): void;
}

interface UpcomingRow {
  event: DiscoverEvent;
  row: HTMLButtonElement;
  badge: HTMLElement;
}

interface DiscoverMatch {
  memberNumber?: number;
  status?: string | null;
  name: string;
  reason?: string | undefined;
  open(): void;
}

interface DiscoverCommunityRow extends DiscoverCommunity {
  open(): void;
}

export interface DiscoverPersonRow {
  memberNumber: number;
  name: string;
  status?: string | null | undefined;
  username?: string | null | undefined;
  avatar?: HTMLElement | null | undefined;
  open(anchor: HTMLElement): void;
}

export interface DiscoverRoomRow {
  id: string;
  name: string;
  icon?: SpaceIcon;
  color?: SpaceColor;
  detail: string;
  open(): void;
}

export interface DiscoverWorkshopRow {
  id: string;
  title: string;
  type: WorkshopType;
  version: string;
  open(): void;
}

const month = new Intl.DateTimeFormat(undefined, { month: 'short' });
const shortEventDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const eventDay = new Intl.DateTimeFormat(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const upcomingMessages = {
  unavailable: 'Upcoming events are unavailable on this server.',
  offline: 'Connect to Cloud to see upcoming events.',
  more: 'More upcoming events may be available in Events.',
};

export class DiscoverPage {
  readonly element = element('section', { className: 'kl-discover-page', ariaLabel: 'Discover' });
  readonly #upcoming = element('div', { className: 'kl-discover-upcoming' });
  readonly #communities = element('div', { className: 'kl-discover-communities' });
  readonly #people = element('div', { className: 'kl-discover-people' });
  readonly #rooms = element('div', { className: 'kl-discover-rooms' });
  readonly #matches = element('div', { className: 'kl-discover-matches' });
  readonly #workshop = element('div', { className: 'kl-discover-workshop' });
  readonly #cards = new Map<DiscoverAction, HTMLElement>();
  readonly #controls = new Map<DiscoverAction, HTMLButtonElement>();
  readonly #grid: HTMLElement;
  readonly #plans: HTMLElement;
  readonly #matching: HTMLElement;
  #upcomingRows: UpcomingRow[] | undefined;
  #matchesReady = false;

  constructor(readonly open: (action: DiscoverAction, anchor: HTMLButtonElement) => void) {
    this.#grid = element('div', { className: 'kl-discover-grid' },
      this.#card('Find your corner', 'communities', 'Communities', this.#communities),
      this.#card('Familiar faces', 'people', 'People', this.#people));
    const plans = this.#control('plans', 'Your plans', 'calendar', 'kl-discover-plans-toggle');
    this.#plans = element('div', { className: 'kl-discover-note' }, kikiIcon('calendar'),
      element('p', {}, element('strong', { text: 'Your time, made a little easier.' }),
        ' RSVP to keep plans together. Save an event when you want to come back to it.'),
      sectionLink(this.#control('my-plans', 'Open my plans')));
    this.#matching = this.#card('A little common ground', 'matches', 'Find matches', this.#matches);
    this.#matching.classList.add('kl-discover-matching');

    this.element.append(
      element('header', { className: 'kl-discover-heading' },
        element('h1', { text: 'Discover' }),
        element('div', { className: 'kl-discover-heading-actions' },
          this.#control('create-event', 'Create event', 'plus', 'kl-text-button--primary'), plans)),
      this.#card('Coming up', 'events', 'All events', this.#upcoming),
      this.#grid,
      this.#card('Rooms', 'rooms', 'Rooms', this.#rooms),
      this.#matching,
      this.#card('Made by your people', 'workshop', 'Workshop', this.#workshop),
      this.#plans);
    this.setVisible(false);
    this.setAvailable(new Set());
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
    if (!visible) {
      this.setUpcoming(undefined);
      this.setCommunities(undefined);
      this.setPeople(undefined);
      this.setRooms(undefined);
      this.setMatches(undefined);
      this.setWorkshop(undefined);
    }
  }

  setAvailable(actions: ReadonlySet<DiscoverAction>): void {
    for (const [action, control] of this.#controls) control.hidden = !actions.has(action);
    for (const [action, card] of this.#cards) card.hidden = !actions.has(action) || (action === 'matches' && !this.#matchesReady);
    this.#grid.hidden = !actions.has('communities') && !actions.has('people');
    this.#plans.hidden = !actions.has('my-plans');
    if (!actions.has('events')) this.setUpcoming(undefined);
    if (!actions.has('communities')) this.setCommunities(undefined);
    if (!actions.has('people')) this.setPeople(undefined);
    if (!actions.has('rooms')) this.setRooms(undefined);
    if (!actions.has('matches')) this.setMatches(undefined);
    if (!actions.has('workshop')) this.setWorkshop(undefined);
  }

  setUpcoming(events: readonly DiscoverEvent[] | undefined): void {
    const focused = events && focusedElement(this.#upcoming);
    const focusedId = focused && this.#upcoming.contains(focused) ? focused.dataset.eventId : undefined;
    this.#resetUpcoming();
    if (!events || this.#cards.get('events')?.hidden) return;

    this.#upcomingRows = events.slice(0, 3).map(event => {
      const starts = new Date(event.startsAt);
      const details = element('span', { className: 'kl-discover-event-copy kl-discover-row-copy' },
        element('strong', { text: event.title, title: event.title }),
        element('small', { className: 'kl-discover-event-time' },
          shortEventDay.format(starts), ' · ', bindClockText(element('time'), event.startsAt),
          '–', bindClockText(element('time'), event.endsAt),
          eventClockContext(event.startsAt, event.endsAt)),
        event.detail ? element('small', { text: event.detail, title: event.detail }) : undefined);
      const date = element('span', { className: 'kl-discover-date', ariaLabel: eventDay.format(starts) },
        element('small', { text: month.format(starts) }), element('strong', { text: String(starts.getDate()) }));
      date.setAttribute('role', 'img');
      const badge = element('span', { className: 'kl-ev-badge' });
      const end = element('span', { className: 'kl-ev-row-end' }, badge, kikiIcon('arrow-right'));
      const row = element('button', { type: 'button', className: 'kl-discover-event kl-discover-row' },
        date, details, end);
      row.dataset.eventId = event.id;
      row.addEventListener('click', () => {
        if (row.isConnected && !row.closest('[hidden]') && Date.now() < event.endsAt) event.open();
      });
      this.#upcoming.append(row);
      return { event, row, badge };
    });
    this.refreshUpcoming();
    if (focusedId) this.#upcomingRows.find(({ event }) => event.id === focusedId)?.row.focus({ preventScroll: true });
  }

  setUpcomingStatus(status: UpcomingStatus, retry?: () => void): void {
    const allEvents = this.#controls.get('events');
    const visible = !this.element.hidden && !this.#cards.get('events')?.hidden;
    if (visible && this.#upcoming.contains(focusedElement(this.#upcoming) ?? null)) {
      allEvents?.focus({ preventScroll: true });
    }
    this.#resetUpcoming();
    if (!visible) return;

    if (status === 'loading') {
      this.#upcoming.setAttribute('aria-busy', 'true');
      const loading = element('div', { className: 'kl-discover-upcoming-loading', ariaLabel: 'Loading events' });
      loading.setAttribute('role', 'status');
      for (let index = 0; index < 3; index++) {
        const row = element('div', { className: 'kl-discover-row kl-discover-event-skeleton' },
          element('span', { className: 'kl-ev-skeleton kl-discover-event-skeleton-date' }),
          element('span', { className: 'kl-discover-event-skeleton-copy' },
            element('span', { className: 'kl-ev-skeleton kl-ev-skeleton--medium' }),
            element('span', { className: 'kl-ev-skeleton kl-ev-skeleton--short' })));
        row.setAttribute('aria-hidden', 'true');
        loading.append(row);
      }
      this.#upcoming.append(loading);
      return;
    }

    if (status === 'error') {
      const message = element('p', {}, kikiIcon('offline'), 'Events couldn’t load');
      message.setAttribute('role', 'alert');
      const feedback = element('div', { className: 'kl-discover-upcoming-error' }, message);
      if (retry) {
        const button = element('button', { type: 'button', className: 'kl-text-button', text: 'Retry' });
        button.addEventListener('click', () => {
          if (!button.isConnected || !this.#upcoming.contains(button) || button.closest('[hidden]')) return;
          allEvents?.focus({ preventScroll: true });
          retry();
        });
        feedback.append(button);
      }
      this.#upcoming.append(feedback);
      return;
    }

    const message = element('p', { className: 'kl-discover-empty', text: upcomingMessages[status] });
    message.setAttribute('role', 'status');
    this.#upcoming.append(message);
  }

  #resetUpcoming(): void {
    this.#upcomingRows = undefined;
    this.#upcoming.removeAttribute('aria-busy');
    this.#upcoming.replaceChildren();
  }

  /** Refresh the timed presentation without replacing actionable rows. */
  refreshUpcoming(now = Date.now()): void {
    if (!this.#upcomingRows) return;
    const focused = focusedElement(this.#upcoming);
    const focusedIndex = this.#upcomingRows.findIndex(({ row }) => row === focused);
    const restoreFocus = focusedIndex >= 0 && this.#upcomingRows[focusedIndex]!.event.endsAt <= now;

    this.#upcomingRows = this.#upcomingRows.filter(({ event, row, badge }) => {
      if (event.endsAt <= now) {
        row.remove();
        return false;
      }
      const marker = eventPreviewBadge(event, now);
      if (badge.textContent !== (marker?.label ?? '')) {
        badge.replaceChildren();
        if (marker) badge.append(...(marker.icon ? [kikiIcon(marker.icon), marker.label] : [marker.label]));
        if (marker?.tone) badge.dataset.tone = marker.tone;
        else delete badge.dataset.tone;
      }
      badge.hidden = !marker;
      return true;
    });
    if (!this.#upcoming.childElementCount) {
      this.#upcoming.append(element('p', { className: 'kl-discover-empty', text: 'No upcoming events yet. You can start something of your own.' }));
    }
    if (restoreFocus && !this.element.hidden) {
      const next = this.#upcomingRows[Math.min(focusedIndex, this.#upcomingRows.length - 1)]?.row ?? this.#controls.get('events');
      next?.focus({ preventScroll: true });
    }
  }

  setCommunities(communities: readonly DiscoverCommunityRow[] | undefined): void {
    this.#communities.replaceChildren();
    if (!communities || this.#cards.get('communities')?.hidden) return;
    if (!communities.length) {
      this.#communities.append(element('p', { className: 'kl-discover-empty', text: 'New communities will appear here.' }));
      return;
    }
    for (const community of communities.slice(0, 3)) {
      const { id, name, memberCount, onlineCount, joined } = community;
      const counts: string[] = [];
      if (memberCount !== null) counts.push(`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`);
      if (onlineCount !== null) counts.push(`${onlineCount} online`);
      const details = counts.join(' · ');
      const row = element('button', { type: 'button', className: 'kl-discover-community kl-discover-row' },
        communityIcon(community),
        element('span', { className: 'kl-discover-row-copy' },
          element('strong', { text: name, title: name }),
          details ? element('small', { text: details, title: details }) : undefined),
        joined ? element('span', { className: 'kl-discover-joined', text: 'Joined' }) : kikiIcon('arrow-right'));
      row.dataset.communityId = id;
      row.addEventListener('click', () => {
        if (row.isConnected && this.#communities.contains(row) && !row.closest('[hidden]')) community.open();
      });
      this.#communities.append(row);
    }
  }

  setPeople(people: readonly DiscoverPersonRow[] | undefined): void {
    this.#people.replaceChildren();
    if (!people || this.#cards.get('people')?.hidden) return;
    if (!people.length) {
      this.#people.append(element('p', { className: 'kl-discover-empty', text: 'Your next connections will appear here.' }));
      return;
    }
    for (const person of people.slice(0, 3)) {
      const { memberNumber, name, status, username } = person;
      const detail = status?.trim() || (username ? `@${username}` : '');
      const initial = (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase();
      const avatar = element('span', { className: 'kl-discover-person-avatar' },
        element('span', { className: 'kl-discover-person-initial', text: initial }), person.avatar);
      markAvatarPresence(avatar, memberNumber);
      avatar.setAttribute('aria-hidden', 'true');
      const row = element('button', { type: 'button', className: 'kl-discover-person kl-discover-row' },
        avatar, element('span', { className: 'kl-discover-row-copy' },
          element('strong', { text: name, title: name }),
          detail ? element('small', { text: detail, title: detail }) : undefined), kikiIcon('arrow-right'));
      row.dataset.memberNumber = String(memberNumber);
      row.addEventListener('click', () => {
        if (row.isConnected && this.#people.contains(row) && !row.closest('[hidden]')) person.open(row);
      });
      this.#people.append(row);
    }
  }

  setRooms(rooms: readonly DiscoverRoomRow[] | undefined): void {
    const active = rooms?.length ? focusedElement(this.#rooms) : undefined;
    const focusedId = active && this.#rooms.contains(active) ? active.dataset.spaceId : undefined;
    this.#rooms.replaceChildren();
    if (!rooms || this.#cards.get('rooms')?.hidden) return;
    let focusTarget: HTMLButtonElement | undefined;
    for (const room of rooms.slice(0, 3)) {
      const { icon, color } = spaceAppearance(room);
      const emblem = element('span', { className: 'kl-sp-card-heading-icon' },
        kikiIcon(icon === 'sparkles' ? 'activities' : icon));
      emblem.setAttribute('aria-hidden', 'true');
      emblem.dataset.color = color;
      const row = element('button', { type: 'button', className: 'kl-discover-room kl-discover-row' },
        emblem, element('span', { className: 'kl-discover-row-copy' },
          element('strong', { text: room.name, title: room.name }),
          element('small', { text: room.detail })), kikiIcon('arrow-right'));
      row.dataset.spaceId = room.id;
      row.addEventListener('click', () => {
        if (row.isConnected && this.#rooms.contains(row) && !row.closest('[hidden]')) room.open();
      });
      this.#rooms.append(row);
      if (room.id === focusedId) focusTarget = row;
    }
    focusTarget?.focus({ preventScroll: true });
  }

  setMatches(matches: readonly DiscoverMatch[] | undefined): void {
    this.#matches.replaceChildren();
    this.#matchesReady = matches !== undefined && this.#controls.get('matches')?.hidden === false;
    this.#matching.hidden = !this.#matchesReady;
    if (!matches || this.#matching.hidden) return;
    for (const match of matches.slice(0, 3)) {
      const reason = match.reason || 'A shared suggestion';
      const initials = Array.from(match.name.trim()).slice(0, 2).join('').toUpperCase();
      const avatar = markAvatarPresence(element('span', { className: 'kl-match-avatar', text: initials }), match.memberNumber ?? 0, match.status ?? null);
      avatar.setAttribute('aria-hidden', 'true');
      const row = element('button', {
        type: 'button', className: 'kl-discover-match kl-discover-row', ariaLabel: `Why this match? ${match.name}`,
      }, avatar, element('span', { className: 'kl-discover-row-copy' },
        element('strong', { text: match.name, title: match.name }),
        element('small', { text: reason })), kikiIcon('arrow-right'));
      row.setAttribute('aria-description', reason);
      row.addEventListener('click', () => {
        if (!this.element.hidden && !this.#matching.hidden && row.isConnected) match.open();
      });
      this.#matches.append(row);
    }
  }

  setWorkshop(packages: readonly DiscoverWorkshopRow[] | undefined): void {
    this.#workshop.replaceChildren();
    if (!packages || this.#cards.get('workshop')?.hidden) return;
    for (const item of packages.slice(0, 3)) {
      const emblem = element('span', { className: 'kl-cm-emblem kl-cm-color-amber' }, kikiIcon(workshopTypeIcons[item.type]));
      emblem.setAttribute('aria-hidden', 'true');
      const row = element('button', { type: 'button', className: 'kl-discover-workshop-row kl-discover-row' },
        emblem, element('span', { className: 'kl-discover-row-copy' },
          element('strong', { text: item.title, title: item.title }),
          element('small', { text: `${item.type} · v${item.version}` })), kikiIcon('arrow-right'));
      row.dataset.packageId = item.id;
      row.addEventListener('click', () => {
        if (row.isConnected && this.#workshop.contains(row) && !row.closest('[hidden]')) item.open();
      });
      this.#workshop.append(row);
    }
  }

  #card(title: string, action: DiscoverAction, label: string, body: HTMLElement): HTMLElement {
    const card = element('section', { className: 'kl-discover-section' },
      element('header', {}, element('h2', { text: title }), sectionLink(this.#control(action, label, undefined, 'kl-discover-link'))), body);
    this.#cards.set(action, card);
    return card;
  }

  #control(action: DiscoverAction, label: string, icon?: KikiLinkIconName, extraClass = ''): HTMLButtonElement {
    const dialogAction = action === 'plans' || action === 'create-event';
    const button = element('button', { type: 'button', className: `kl-text-button ${extraClass}`.trim(), ariaLabel: label },
      icon ? kikiIcon(icon) : undefined, element('span', { text: label }));
    if (dialogAction) button.setAttribute('aria-haspopup', 'dialog');
    if (action === 'plans') button.title = label;
    button.addEventListener('click', () => {
      if (button.isConnected && !button.closest('[hidden]')) this.open(action, button);
    });
    this.#controls.set(action, button);
    return button;
  }
}
