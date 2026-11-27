import { roomOptions } from '../../bc/room-options';

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

export function matchesBackgrounds(saved?: string): string[] {
  const names = roomOptions().backgrounds.map(item => item.name).filter(validName);
  const choices = new Set(names.length ? names : fallback);
  if (saved && validName(saved)) choices.add(saved);
  return [...choices];
}

export function randomMatchesBackground(list: string[], previous?: string): string {
  const choices = list.filter(name => name !== previous);
  return choices[Math.floor(Math.random() * choices.length)] ?? previous ?? 'CosyChalet';
}
