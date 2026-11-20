import type { SettingsStore } from '../../core/settings';
import type { WorkshopUIPayload } from '../../core/workshop-destinations';
import { workshopPaletteReadable } from '../../core/workshop-destinations';
import { checkedWorkshopRelease, type InstalledWorkshopPackage } from './workshop-installation-model';
import type { PersistentSpace, SpaceRoom } from './spaces-page';

export const workshopUIFingerprint = (store: SettingsStore): string => {
  const ui = store.getSection('ui');
  return JSON.stringify([ui.accent, ui.density, ui.theme, ui.workshopPalette]);
};
export function applyWorkshopUITheme(store: SettingsStore, item: InstalledWorkshopPackage, expected: string, current: () => boolean): void {
  const release = checkedWorkshopRelease(item.release);
  if (release.type !== 'UI theme') throw new Error('Choose an interface theme.');
  const p = release.payload as WorkshopUIPayload;
  if (!workshopPaletteReadable(p)) throw new Error('Choose darker panels and a visible accent before applying this theme.');
  if (!current() || workshopUIFingerprint(store) !== expected) throw new Error('Your account, installation or appearance changed. Review the theme again.');
  store.update(draft => {
    if (!current() || workshopUIFingerprint(store) !== expected) throw new Error('Review closed or appearance changed.');
    draft.ui.theme = 'dark'; draft.ui.accent = p.accent.toLowerCase();
    draft.ui.density = p.density === 'Compact' ? 'compact' : 'comfortable';
    draft.ui.workshopPalette = { packageId: item.id, version: release.version, label: release.title, primary: p.primary.toLowerCase(), secondary: p.secondary.toLowerCase() };
  }, { requirePersistence: true });
}
export async function workshopPresetId(origin: string, packageId: string, version: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${origin}:${packageId}:${version}:space-preset`)));
  bytes[6] = (bytes[6]! & 15) | 64; bytes[8] = (bytes[8]! & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), n => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function workshopSpaceBody(space: PersistentSpace, item: InstalledWorkshopPackage, presetId: string, searchSpace: SpaceRoom['searchSpace']): Record<string, unknown> {
  if (!space.canManage || !space.canRead || space.archived || !Number.isSafeInteger(space.revision) || space.revision < 1 || !Array.isArray(space.presets) || !Array.isArray(space.rules) || typeof space.announcement !== 'string') throw new Error('Choose an available Space you manage.');
  const release = checkedWorkshopRelease(item.release), p = release.payload;
  const room = structuredClone(space.room ?? null), presets = structuredClone(space.presets);
  if (release.type === 'Room preset') {
    if (!['', 'X', 'M'].includes(searchSpace)) throw new Error('Choose the BC room search space.');
    if (presets.some(preset => preset.id === presetId)) throw new Error('This version already has a saved preset here. Your copy is kept.');
    if (presets.length >= 8) throw new Error('This Space already has 8 presets. Remove one before adding another.');
    presets.push({ id: presetId, label: release.title.slice(0, 60), room: { name: p.name!, description: p.description!, searchSpace, background: p.background!, capacity: p.capacity!, ...(p.restoreOnOpen===undefined?{}:{restoreOnOpen:p.restoreOnOpen}) } });
  } else if (release.type === 'Background') {
    if (!room) throw new Error('Link a room in this Space before applying a background.');
    room.background = p.background!; room.palette = { primary: p.primary!, secondary: p.secondary! };
  } else throw new Error('This package does not target a Space.');
  return { operationId: crypto.randomUUID(), revision: space.revision, name: space.name, description: space.description, language: space.language, tags: [...space.tags], access: space.access, discoverable: space.discoverable, announcement: space.announcement, rules: [...space.rules], room, presets };
}
