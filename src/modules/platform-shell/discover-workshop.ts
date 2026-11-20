import { matchObject, matchText } from '../../../cloud/shared/matching.mjs';
import type { CloudClient } from '../../cloud/client';
import { checkedWorkshopCatalog, type WorkshopCatalogPage } from './workshop-catalog';
import { workshopAccessAt, workshopSource } from './workshop-generation';
import { checkedWorkshopPage, WORKSHOP_TYPES, type WorkshopPage, type WorkshopSummary, type WorkshopType } from './workshop-model';

export interface DiscoverWorkshopItem {
  id: string;
  author: number;
  title: string;
  type: WorkshopType;
  version: string;
  featured: boolean;
}

const previewLimit = 3;
const previewFlags = ['workshopCatalog', 'workshopDiscovery', 'roomOpening', 'workshopCommunityTemplates', 'workshopRoomThemes'];

/** Preview only current, publicly browsable releases. The full view reads details again. */
export async function loadDiscoverWorkshop(client: CloudClient, current: () => boolean): Promise<DiscoverWorkshopItem[] | undefined> {
  const owner = client.memberNumber;
  const origin = client.origin;
  const valid = () => client.connected && client.memberNumber === owner && client.origin === origin && current();
  try {
    if (!valid()) return;
    const me = await client.request<unknown>('GET', '/v1/me');
    if (!valid() || !matchObject(me) || me.memberNumber !== owner ||
      !matchObject(me.features) || me.features.workshopPublications !== true) return;
    const features = me.features;
    if (previewFlags.some(flag => features[flag] !== undefined && typeof features[flag] !== 'boolean')) return;
    const source = workshopSource(me);
    if (source.restored && !source.required) return;
    const format = features.roomOpening ? '6' : features.workshopCommunityTemplates ? '4' : features.workshopRoomThemes ? '2' : '1';
    const supportedTypes = WORKSHOP_TYPES.slice(0, format === '1' ? 3 : format === '2' ? 6 : WORKSHOP_TYPES.length);
    const canShow = (item: WorkshopSummary) => supportedTypes.includes(item.type) &&
      !client.isProfileBlocked(item.author) && matchText(item.title, 80) && item.title.trim().length >= 3;

    let items: WorkshopSummary[];
    if (features.workshopCatalog) {
      const read = async (collection: 'featured' | 'all') => {
        if (!valid()) throw new Error('Stale Workshop preview');
        const query = new URLSearchParams({
          scope: 'browse', ...(features.workshopDiscovery ? { collection } : {}), sort: 'newest', limit: String(previewLimit), format,
        });
        const page = await client.request<WorkshopCatalogPage>('GET', '/v1/workshop/catalog?' + query);
        if (!valid() || !Array.isArray(page?.items) || page.items.length > previewLimit) throw new Error('Invalid Workshop preview');
        return checkedWorkshopCatalog(page, 'newest', 'browse', owner, '', collection).items;
      };
      items = features.workshopDiscovery ? await read('featured') : [];
      if (items.filter(canShow).length < previewLimit) items.push(...await read('all'));
    } else {
      const query = new URLSearchParams({ scope: 'browse', limit: String(previewLimit) });
      if (format !== '1') query.set('format', format);
      const page = await workshopAccessAt(client, source, valid).request<WorkshopPage>('GET', '/v1/workshop?' + query);
      items = checkedWorkshopPage(page, 0, previewLimit, undefined, true).items;
    }
    if (!valid()) return;

    const projected = new Map<string, DiscoverWorkshopItem>();
    for (const item of items) {
      if (!item.version || !canShow(item)) continue;
      projected.set(item.id, {
        id: item.id, author: item.author, title: item.title, type: item.type, version: item.version,
        featured: features.workshopDiscovery === true && item.discovery?.featured === true,
      });
    }
    return [...projected.values()].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, previewLimit);
  } catch {
    // Workshop navigation remains available if the preview cannot be confirmed.
  }
}
