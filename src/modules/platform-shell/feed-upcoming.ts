import type { CloudClient } from '../../cloud/client';
import { bindClockText } from '../../core/time-format';
import { element, focusedElement } from '../../utils/dom';
import { kikiIcon } from '../link-chat/icons';
import { communityIcon } from './community-design';
import { loadDiscoverEvents, type DiscoverEventsResult, type DiscoverEventSummary } from './discover-events';
import { eventPreviewBadge } from './event-badges';
import { eventClockContext } from './event-time';
import { loadFeedUpcomingCommunities, type FeedUpcomingCommunity } from './feed-upcoming-communities';
import { fitPanelDialog } from './panel-dialog-layout';

export { FEED_UPCOMING_STYLES } from './feed-upcoming-styles';

interface FeedUpcomingOptions {
  current: () => boolean;
  openEvents: () => void;
  openEvent: (id: string) => void;
  openCommunity: (id: string) => void;
}

interface Opening {
  anchor: HTMLElement;
  allEvents: HTMLButtonElement;
  valid: () => boolean;
  current: () => boolean;
  release?: () => void;
}

const eventDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const invalidations = new Set([
  'session', 'calendar', 'communities', 'spaces', 'profiles-cleared', 'privacy', 'relationships',
]);
const accessLabels = { public: 'Public', request: 'Request only', private: 'Private' };

export class FeedUpcomingDrawer {
  readonly element: HTMLDialogElement;
  readonly #closeButton: HTMLButtonElement;
  readonly #actions: HTMLElement;
  readonly #events: HTMLElement;
  readonly #communities: HTMLElement;
  #opening: Opening | undefined;
  #eventTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly client: CloudClient, private readonly options: FeedUpcomingOptions) {
    this.#closeButton = element('button', {
      type: 'button', className: 'kl-browse-icon kl-feed-upcoming-close', ariaLabel: 'Close dialog', title: 'Close dialog',
      onClick: () => this.close(true),
    }, kikiIcon('close'));
    this.#actions = element('div', { className: 'kl-feed-upcoming-actions' }, this.#closeButton);
    this.#events = element('section', { className: 'kl-feed-upcoming-events', ariaLabel: 'Upcoming events' });
    this.#communities = element('div', { className: 'kl-feed-upcoming-communities' });
    this.#events.setAttribute('aria-live', 'polite');
    this.#communities.setAttribute('aria-live', 'polite');
    this.element = element('dialog', { className: 'kl-dialog kl-feed-upcoming-drawer', ariaLabel: 'Coming up' },
      element('header', { className: 'kl-feed-upcoming-header' },
        element('h2', { text: 'Coming up' }),
        this.#actions),
      element('div', { className: 'kl-feed-upcoming-body' },
        this.#events,
        element('section', {}, element('h3', { text: 'Communities' }), this.#communities)));
    this.element.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    this.element.addEventListener('cancel', event => {
      event.preventDefault();
      this.close(true);
    });
    this.element.addEventListener('close', () => {
      if (!this.element.open) this.close(true);
    });
    this.element.addEventListener('click', event => {
      if (event.target !== this.element) return;
      const bounds = this.element.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX >= bounds.right ||
        event.clientY < bounds.top || event.clientY >= bounds.bottom) this.close(true);
    });
  }

  open(anchor: HTMLElement, current: () => boolean = () => true): void {
    const { memberNumber, origin } = this.client;
    const valid = () => this.client.connected && this.client.memberNumber === memberNumber && this.client.origin === origin &&
      this.options.current() && current() && this.element.isConnected && anchor.isConnected && !anchor.closest('[hidden]');
    if (this.element.open || !valid()) return;
    this.close();

    const allEvents = element('button', {
      type: 'button', className: 'kl-text-button kl-feed-upcoming-all-events', text: 'All events',
      onClick: () => {
        if (!allEvents.hidden) this.#navigate(opening, this.options.openEvents);
      },
    });
    const opening: Opening = {
      anchor, allEvents, valid,
      current: () => this.#opening === opening && this.element.open && valid(),
    };
    this.#opening = opening;
    this.#actions.prepend(allEvents);
    this.#status(this.#events, 'loading', 'Loading upcoming events…');
    this.#status(this.#communities, 'loading', 'Loading communities…');
    this.element.showModal();
    if (!opening.current()) {
      this.close();
      return;
    }

    const releaseFit = fitPanelDialog(this.element, { layout: () => ({ marginX: 0, marginY: 0 }) });
    const unsubscribe = this.client.subscribe(kind => {
      if (this.#opening === opening && (!opening.current() || invalidations.has(kind))) this.close(true);
    });
    const observer = new MutationObserver(() => {
      if (this.#opening === opening && !opening.current()) this.close();
    });
    // Watch only the ancestors whose removal or hidden state can invalidate the opener.
    const watched = new Set<Node>();
    for (const target of [anchor, this.element]) {
      for (let node: Node | null = target; node && !watched.has(node);
        node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null)) {
        watched.add(node);
        observer.observe(node, { childList: true, attributeFilter: ['hidden'] });
      }
    }
    opening.release = () => { releaseFit?.(); unsubscribe(); observer.disconnect(); };
    this.#closeButton.focus({ preventScroll: true });
    if (!opening.current()) return;

    void loadDiscoverEvents(this.client, opening.current).then(result => {
      if (result && opening.current()) this.#renderEvents(result, opening);
    });
    void loadFeedUpcomingCommunities(this.client, opening.current).then(rows => {
      if (opening.current()) this.#renderCommunities(rows, opening);
    });
  }

  close(restoreFocus = false): void {
    const opening = this.#opening;
    if (!opening && !this.element.open) return;
    this.#opening = undefined;
    opening?.release?.();
    clearTimeout(this.#eventTimer);
    this.#eventTimer = undefined;
    opening?.allEvents.remove();
    this.#events.replaceChildren();
    this.#communities.replaceChildren();
    if (this.element.open) this.element.close();
    if (restoreFocus && opening?.valid()) opening.anchor.focus({ preventScroll: true });
  }

  destroy(): void {
    this.close();
    this.element.remove();
  }

  #navigate(opening: Opening, action: () => void): void {
    if (!opening.current()) return;
    this.close();
    if (opening.valid()) action();
  }

  #status(section: HTMLElement, state: string, text: string): void {
    section.dataset.state = state;
    section.replaceChildren(element('p', { className: 'kl-feed-upcoming-status', text }));
  }

  #renderEvents(result: DiscoverEventsResult, opening: Opening): void {
    if (result.kind === 'unavailable' && focusedElement(this.element) === opening.allEvents) {
      this.#closeButton.focus({ preventScroll: true });
    }
    opening.allEvents.hidden = result.kind === 'unavailable';
    if (result.kind !== 'ready') {
      const messages = {
        more: 'More events are available in Events.',
        unavailable: 'Events are unavailable.',
        error: 'Events couldn’t load.',
      };
      this.#status(this.#events, result.kind, messages[result.kind]);
      return;
    }

    const previousFocus = focusedElement(this.#events);
    const focusedId = this.#events.contains(previousFocus ?? null) ? previousFocus?.dataset.eventId : undefined;
    const now = Date.now();
    const events = result.rows.filter(event => event.endsAt > now);
    if (events.length) {
      this.#events.dataset.state = 'ready';
      this.#events.replaceChildren(...events.map(event => this.#eventRow(event, opening, now)));
    } else {
      this.#status(this.#events, 'empty', 'No upcoming events.');
    }
    if (focusedId) {
      const focus = Array.from(this.#events.querySelectorAll<HTMLElement>('[data-event-id]'))
        .find(row => row.dataset.eventId === focusedId) ?? opening.allEvents;
      focus.focus({ preventScroll: true });
    }

    const next = Math.min(...events.map(event => event.startsAt > now ? event.startsAt : event.endsAt));
    if (Number.isFinite(next)) {
      this.#eventTimer = setTimeout(() => {
        if (opening.current()) this.#renderEvents(result, opening);
      }, Math.min(next - now, 2_147_483_647));
    }
  }

  #eventRow(event: DiscoverEventSummary, opening: Opening, now: number): HTMLButtonElement {
    const marker = eventPreviewBadge(event, now);
    const badge = marker && element('span', { className: 'kl-ev-badge' },
      marker.icon ? kikiIcon(marker.icon) : undefined, marker.label);
    if (badge && marker.tone) badge.dataset.tone = marker.tone;
    const row = element('button', { className: 'kl-feed-upcoming-row', type: 'button' },
      element('span', { className: 'kl-feed-upcoming-event-icon' }, kikiIcon('calendar')),
      element('span', { className: 'kl-feed-upcoming-copy' },
        element('strong', { text: event.title, title: event.title }),
        element('small', {},
          eventDay.format(event.startsAt), ' · ', bindClockText(element('time'), event.startsAt), '–',
          bindClockText(element('time'), event.endsAt), eventClockContext(event.startsAt, event.endsAt)),
        event.detail ? element('small', { text: event.detail, title: event.detail }) : undefined,
        badge),
      kikiIcon('arrow-right'));
    row.dataset.eventId = event.id;
    row.addEventListener('click', () => {
      if (this.#events.contains(row) && event.endsAt > Date.now()) {
        this.#navigate(opening, () => this.options.openEvent(event.id));
      }
    });
    return row;
  }

  #renderCommunities(communities: FeedUpcomingCommunity[] | undefined, opening: Opening): void {
    if (!communities?.length) {
      this.#status(this.#communities, communities ? 'empty' : 'unavailable', communities ?
        'Your joined communities will appear here.' : 'Communities are unavailable.');
      return;
    }
    this.#communities.dataset.state = 'ready';
    this.#communities.replaceChildren(...communities.map(community => {
      const { id, name, access, memberCount } = community;
      const label = accessLabels[access];
      const details = memberCount === null ? label : `${label} · ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
      const row = element('button', { className: 'kl-feed-upcoming-row', type: 'button' },
        communityIcon(community),
        element('span', { className: 'kl-feed-upcoming-copy' },
          element('strong', { text: name, title: name }),
          element('small', { text: details })),
        kikiIcon('arrow-right'));
      row.dataset.communityId = id;
      row.addEventListener('click', () => {
        if (this.#communities.contains(row)) this.#navigate(opening, () => this.options.openCommunity(id));
      });
      return row;
    }));
  }
}
