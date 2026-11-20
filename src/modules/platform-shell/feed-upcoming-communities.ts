import { matchInteger, matchObject, matchText, matchUuid } from '../../../cloud/shared/matching.mjs';
import type { CloudClient } from '../../cloud/client';
import { communityManagementRead } from '../../cloud/moderation-generation';
import { COMMUNITY_COLORS, COMMUNITY_ICONS } from './community-design';

export interface FeedUpcomingCommunity {
  id: string;
  name: string;
  icon: string;
  color: string;
  access: 'public' | 'request' | 'private';
  memberCount: number | null;
}

const pageLimit = 5;
const maxPages = 2;
const previewLimit = 3;

/** Load a bounded membership preview for a single owner, origin and drawer view. */
export async function loadFeedUpcomingCommunities(client: CloudClient, current: () => boolean): Promise<FeedUpcomingCommunity[] | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  try {
    if (!valid()) return;
    const me = await client.request<unknown>('GET', '/v1/me');
    if (!valid() || !matchObject(me) || me.memberNumber !== owner || !matchObject(me.features) || me.features.communities !== true) return;
    const directory = me.features.communityDirectory;
    if (directory !== undefined && typeof directory !== 'boolean') return;

    const read = communityManagementRead(client, me);
    const rows: FeedUpcomingCommunity[] = [];
    const seen = new Set<string>();
    let cursor = '';
    for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
      const path = directory
        ? `/v1/community-directory?scope=mine&sort=recommended&limit=${pageLimit}${cursor ? `&cursor=${cursor}` : ''}`
        : `/v1/communities?scope=mine&cursor=${cursor || '0'}&limit=${pageLimit}`;
      const page = await read.request<unknown>('GET', path);
      if (!valid() || !matchObject(page) || !Array.isArray(page.items) || page.items.length > pageLimit) return;

      for (const item of page.items) {
        if (!matchObject(item) || !matchUuid(item.id) || !matchText(item.name, 64) || !item.name.trim() ||
          item.membership !== 'active' || item.archived !== false || (item.canRead !== undefined && item.canRead !== true) ||
          (item.restricted !== false && (directory || item.restricted !== undefined)) ||
          (item.access !== 'public' && item.access !== 'request' && item.access !== 'private')) continue;
        const idKey = item.id.toLowerCase();
        if (seen.has(idKey)) continue;
        seen.add(idKey);
        rows.push({
          id: item.id,
          name: item.name,
          icon: COMMUNITY_ICONS.find(icon => icon === item.icon) ?? 'users',
          color: COMMUNITY_COLORS.find(color => color === item.color) ?? 'rose',
          access: item.access,
          memberCount: matchInteger(item.memberCount) ? item.memberCount : null,
        });
        if (rows.length === previewLimit) return rows;
      }

      const next = page.nextCursor;
      if (next === null || next === undefined) return rows;
      if (directory ? typeof next !== 'string' || !/^[A-Za-z0-9_-]{1,3000}$/u.test(next) || next === cursor
        : !matchInteger(next, 1) || (!!cursor && next >= Number(cursor))) return;
      cursor = String(next);
    }
    if (rows.length) return rows;
  } catch {
    // The drawer can still offer navigation when the preview is unavailable.
  }
}
