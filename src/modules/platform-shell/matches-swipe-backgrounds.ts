import type { RemoteImageLease } from '../link-chat/remote-image-loader';
import { roomOptions, type RoomBackground } from '../../bc/room-options';

const fallback = ['CosyChalet', 'ParkNight', 'BeachSunset'];
const validName = (name: string) => /^[a-zA-Z0-9_-]{1,96}$/u.test(name);

export function matchesBackgroundUrl(name: string): string {
  return 'Backgrounds/' + encodeURIComponent(validName(name) ? name : 'CosyChalet') + '.jpg';
}

export function matchesBackgroundLabel(name: string): string {
  try {
    const label = typeof BackgroundsTextGet === 'function' ? BackgroundsTextGet(name) : '';
    if (label && label !== name && !label.startsWith('MISSING')) return label;
  } catch { /* Translation table may still be loading at login. */ }
  return name.replace(/([a-z])([A-Z])/gu, '$1 $2').replaceAll('_', ' ');
}

export function matchesBackgroundChoices(saved?: string): RoomBackground[] {
  const choices = new Map<string, RoomBackground>();
  for (const item of roomOptions().backgrounds) if (validName(item.name)) {
    choices.set(item.name, { ...item, label: matchesBackgroundLabel(item.name) });
  }
  for (const name of [...(choices.size ? [] : fallback), ...(saved && validName(saved) ? [saved] : [])]) {
    if (!choices.has(name)) choices.set(name, { name, label: matchesBackgroundLabel(name), tags: [] });
  }
  return [...choices.values()];
}

export type MatchesBackgroundLoader = (url: string, signal: AbortSignal) => Promise<RemoteImageLease>;

/** RemoteImageLoader checks the origin, type and size and returns a local Blob URL.
 * Keep its decode lease until the browser displays the image or the owner leaves. */
export async function loadMatchesBackground(image: HTMLImageElement, name: string, url: string,
  load: MatchesBackgroundLoader, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false;
  image.referrerPolicy = 'no-referrer';
  try {
    const lease = await load(url, signal);
    try {
      if (signal.aborted) return false;
      return await new Promise<boolean>(resolve => {
        function finish(ok: boolean) {
          signal.removeEventListener('abort', abort);
          image.removeEventListener('load', shown);
          image.removeEventListener('error', failed);
          if (!ok && !signal.aborted) image.src = matchesBackgroundUrl(name);
          resolve(ok);
        }
        const abort = () => finish(false);
        const shown = () => finish(true);
        const failed = () => finish(false);
        signal.addEventListener('abort', abort, { once: true });
        image.addEventListener('load', shown, { once: true });
        image.addEventListener('error', failed, { once: true });
        image.src = lease.url;
      });
    } finally { lease.release(); }
  } catch { return false; }
}

export function randomMatchesBackground(list: string[], previous?: string): string {
  const choices = list.filter(name => name !== previous);
  return choices[Math.floor(Math.random() * choices.length)] ?? previous ?? 'CosyChalet';
}
