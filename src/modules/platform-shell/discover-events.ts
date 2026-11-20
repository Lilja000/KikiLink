import { matchText, matchUuid } from '../../../cloud/shared/matching.mjs';
import { calendarRead } from '../../cloud/calendar-mutation-intent';
import type { CloudClient } from '../../cloud/client';
import type { CalendarEvent } from './events-page';

export interface DiscoverEventSummary {
  id: string;
  title: string;
  startsAt: number;
  endsAt: number;
  detail: string;
  rsvp: CalendarEvent['rsvp'];
  going: number;
  capacity: number;
}

export type DiscoverEventsResult =
  | { kind: 'ready'; rows: DiscoverEventSummary[] }
  | { kind: 'more' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

const previewLimit = 3;

/** A small Calendar projection for Discover. Event details authorize the selected item again. */
export async function loadDiscoverEvents(client: CloudClient, current: () => boolean): Promise<DiscoverEventsResult | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  try {
    if (!valid()) return;
    const me = await client.request<{ memberNumber: number; features?: { eventsRsvp?: boolean; eventDiscovery?: boolean } }>('GET', '/v1/me');
    if (!valid()) return;
    if (me?.memberNumber !== owner) return { kind: 'error' };
    const features = me.features;
    if (features !== undefined && (!features || typeof features !== 'object' || Array.isArray(features) ||
      (features.eventsRsvp !== undefined && typeof features.eventsRsvp !== 'boolean') ||
      (features.eventDiscovery !== undefined && typeof features.eventDiscovery !== 'boolean'))) return { kind: 'error' };
    if (features?.eventsRsvp !== true) return { kind: 'unavailable' };
    const read = calendarRead(client, me).request;
    const params = new URLSearchParams({ limit: String(previewLimit), scope: 'all', when: 'upcoming', status: 'scheduled' });
    const discover = features.eventDiscovery === true;
    if (discover) params.set('sort', 'soonest');
    const { items, nextCursor } = await read<{ items: CalendarEvent[]; nextCursor: string | null }>(
      `/v1/calendar/${discover ? 'discover' : 'events'}?${params}`);
    if (!valid()) return;
    if (!Array.isArray(items) || items.length > previewLimit ||
      (nextCursor !== null && (typeof nextCursor !== 'string' || !nextCursor.trim()))) return { kind: 'error' };

    const now = Date.now();
    const seen = new Set<string>();
    const rows: DiscoverEventSummary[] = [];
    for (const item of items) {
      if (!item || !matchUuid(item.id) || seen.has(item.id) || !matchText(item.title, 80) ||
        !item.title.trim() || !Number.isSafeInteger(item.host) || item.host <= 0 ||
        !Number.isSafeInteger(item.startsAt) || item.startsAt <= 0 || !Number.isSafeInteger(item.endsAt) ||
        item.endsAt <= item.startsAt || item.endsAt > 8_640_000_000_000_000 ||
        !['none', 'going', 'maybe', 'waitlist'].includes(item.rsvp) ||
        !Number.isSafeInteger(item.going) || item.going < 0 ||
        !Number.isSafeInteger(item.capacity) || item.capacity <= 0 ||
        typeof item.archived !== 'boolean' || !['scheduled', 'cancelled'].includes(item.status)) return { kind: 'error' };
      seen.add(item.id);
      if (item.archived || item.status !== 'scheduled' || item.endsAt <= now || client.isProfileBlocked(item.host)) continue;
      const host = item.hostProfile;
      const hostName = host?.profileVisible === true && host.memberNumber === item.host ? host.displayName : null;
      const detail = [item.communityName, hostName]
        .find(value => matchText(value, 80) && Boolean(value.trim())) ?? '';
      rows.push({
        id: item.id, title: item.title, startsAt: item.startsAt, endsAt: item.endsAt, detail,
        rsvp: item.rsvp, going: item.going, capacity: item.capacity,
      });
    }
    if (!rows.length && nextCursor) return { kind: 'more' };
    return { kind: 'ready', rows: rows.sort((left, right) => left.startsAt - right.startsAt) };
  } catch {
    if (valid()) return { kind: 'error' };
  }
}
