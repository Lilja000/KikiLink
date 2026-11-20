import { matchObject, matchText, matchUuid } from '../../../cloud/shared/matching.mjs';
import { spaceAppearance, type SpaceAppearance } from '../../../cloud/shared/space-appearance.mjs';
import type { CloudClient } from '../../cloud/client';
import { spaceRead } from '../../cloud/space-mutation-intent';
import type { SpaceRoom } from './spaces-page';

export interface DiscoverSpace extends SpaceAppearance {
  id: string;
  name: string;
  room: Pick<SpaceRoom, 'name' | 'searchSpace'> | null;
}

const previewLimit = 3;

/** Preview readable Spaces; opening one performs a new authorized detail read. */
export async function loadDiscoverSpaces(client: CloudClient, current: () => boolean): Promise<DiscoverSpace[] | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  try {
    if (!valid()) return;
    const me = await client.request<unknown>('GET', '/v1/me');
    if (!valid() || !matchObject(me) || me.memberNumber !== owner ||
      !matchObject(me.features) || me.features.persistentSpaces !== true) return;
    const directory = me.features.spaceDirectory;
    if (directory !== undefined && typeof directory !== 'boolean') return;
    const path = `/v1/spaces?scope=all&limit=${previewLimit}${directory ? '&directory=1' : ''}`;
    const page = await spaceRead(client, me).request<unknown>(path);
    if (!valid() || !matchObject(page) || !Array.isArray(page.items) || page.items.length > previewLimit) return;

    const rows: DiscoverSpace[] = [];
    const seen = new Set<string>();
    for (const item of page.items) {
      if (!matchObject(item) || !matchUuid(item.id) || seen.has(item.id) ||
        !matchText(item.name, 64) || !item.name.trim() || item.discoverable !== true ||
        item.archived !== false || item.spaceArchived === true || item.canRead !== true) continue;
      const rawRoom = matchObject(item.room) ? item.room : null;
      const room: DiscoverSpace['room'] = rawRoom && matchText(rawRoom.name, 80) && rawRoom.name.trim() &&
        (rawRoom.searchSpace === '' || rawRoom.searchSpace === 'X' || rawRoom.searchSpace === 'M')
        ? { name: rawRoom.name, searchSpace: rawRoom.searchSpace } : null;
      const appearance = spaceAppearance({
        icon: item.icon, color: item.color, room: room ? { background: rawRoom?.background } : null,
      });
      seen.add(item.id);
      rows.push({ id: item.id, name: item.name, ...appearance, room });
    }
    return rows;
  } catch {
    // Keep Rooms navigation available when the preview cannot be confirmed.
  }
}
