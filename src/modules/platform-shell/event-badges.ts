import type { KikiLinkIconName } from '../link-chat/icons';
import type { CalendarEvent } from './events-page';

export interface EventBadge {
  label: string;
  icon?: KikiLinkIconName;
  tone?: 'gold' | 'danger' | 'live';
}

type EventState = Pick<CalendarEvent, 'startsAt' | 'endsAt' | 'going' | 'capacity'> &
  Partial<Pick<CalendarEvent, 'archived' | 'status'>>;

const selectionBadges: Record<Exclude<CalendarEvent['rsvp'], 'none'>, EventBadge> = {
  going: { label: 'Going', icon: 'check', tone: 'gold' },
  maybe: { label: 'Maybe', icon: 'clock' },
  waitlist: { label: 'On waitlist', icon: 'clock' },
};

export function eventSelectionBadge(rsvp: CalendarEvent['rsvp']): EventBadge | undefined {
  return rsvp === 'none' ? undefined : selectionBadges[rsvp];
}

export function eventStateBadge(event: EventState, now = Date.now()): EventBadge | undefined {
  if (event.archived) return { label: 'Archived community' };
  if (event.status === 'cancelled') return { label: 'Cancelled', tone: 'danger' };
  if (event.endsAt <= now) return { label: 'Ended' };
  if (event.startsAt <= now) return { label: 'Happening now', icon: 'clock', tone: 'live' };
  return event.going >= event.capacity ? { label: 'Full · waitlist open' } : undefined;
}

export function eventPreviewBadge(event: EventState & Pick<CalendarEvent, 'rsvp'>, now = Date.now()): EventBadge | undefined {
  return eventSelectionBadge(event.rsvp) ?? eventStateBadge(event, now);
}
