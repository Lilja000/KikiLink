import { matchInteger, matchObject, matchText, matchUuid } from '../../../cloud/shared/matching.mjs';
import type { CloudClient } from '../../cloud/client';
import { communityManagementRead } from '../../cloud/moderation-generation';
import { COMMUNITY_COLORS, COMMUNITY_ICONS } from './community-design';

export interface DiscoverCommunity {
  id: string;
  name: string;
  icon: string;
  color: string;
  memberCount: number | null;
  onlineCount: number | null;
  joined: boolean;
}

const previewLimit = 3;

/** Discover needs only a first page. Communities rechecks access when a row is opened. */
export async function loadDiscoverCommunities(client: CloudClient, current: () => boolean): Promise<DiscoverCommunity[] | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  try {
    if (!valid()) return;
    const me = await client.request<{ memberNumber: number; features?: { communities?: boolean; communityDirectory?: boolean } }>(
      'GET', '/v1/me');
    if (!valid() || me.memberNumber !== owner || me.features?.communities !== true) return;
    const directory = me.features.communityDirectory;
    if (directory !== undefined && typeof directory !== 'boolean') return;
    const read = communityManagementRead(client, me);
    const page = await read.request<unknown>('GET', directory
      ? `/v1/community-directory?scope=discover&sort=recommended&limit=${previewLimit}`
      : `/v1/communities?scope=discover&cursor=0&limit=${previewLimit}`);
    if (!valid() || !matchObject(page) || !Array.isArray(page.items) || page.items.length > previewLimit) return;

    const seen = new Set<string>();
    const rows: DiscoverCommunity[] = [];
    for (const item of page.items) {
      if (!matchObject(item) || !matchUuid(item.id) || seen.has(item.id) || !matchText(item.name, 64) || !item.name.trim() ||
        item.archived !== false || item.discoverable !== true || (item.restricted !== false && item.restricted !== undefined) ||
        typeof item.access !== 'string' || !['public', 'request', 'private'].includes(item.access) ||
        typeof item.membership !== 'string' || !['active', 'none', 'requested', 'invited'].includes(item.membership)) continue;
      const joined = item.membership === 'active';
      if (!joined && item.access === 'private') continue;
      seen.add(item.id);
      rows.push({
        id: item.id,
        name: item.name,
        icon: COMMUNITY_ICONS.find(icon => icon === item.icon) ?? 'users',
        color: COMMUNITY_COLORS.find(color => color === item.color) ?? 'rose',
        memberCount: matchInteger(item.memberCount) ? item.memberCount : null,
        onlineCount: joined && matchInteger(item.onlineCount) ? item.onlineCount : null,
        joined,
      });
    }
    return rows;
  } catch {
    // Keep destination navigation available if the preview cannot be confirmed.
  }
}
