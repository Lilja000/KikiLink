// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import * as wardrobe from '../src/bc/matches-wardrobe';
import type { SwipeCard, SwipeCardDraft } from '../src/cloud/matches-swipe';
import { mountMatchesSwipeEditor } from '../src/modules/platform-shell/matches-swipe-editor';

const mounted: Array<() => void> = [];
afterEach(() => {
  mounted.splice(0).forEach(stop => stop());
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function editor(card: SwipeCard | null = null) {
  vi.stubGlobal('Player', { Name: 'Kiki', MemberNumber: 19 });
  const host = document.createElement('div');
  document.body.append(host);
  const onSave = vi.fn(async (_draft: SwipeCardDraft) => {});
  const onRemove = vi.fn(async () => {});
  mounted.push(mountMatchesSwipeEditor(host, { card, memberNumber: 19, loadImage: async () => null, onSave, onRemove }));
  const save = () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const slots = () => [...host.querySelectorAll<HTMLButtonElement>('.pick')];
  return { host, save, slots, onSave, onRemove };
}

it('keeps the latest chosen real slot when a slower initial snapshot finishes; folding the row preserves its selection', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([0, 2, 4, 7, 9, 12].map(slot => ({ slot, name: 'Look ' + slot })));
  let finishFirst!: (s: string) => void;
  const first = new Promise<string>(resolve => { finishFirst = resolve; });
  vi.spyOn(wardrobe, 'captureWardrobeSlot').mockImplementation(async slot => slot === 0 ? first : 'snapshot-' + slot);
  const f = editor();
  expect(f.slots().map(b => b.dataset.slot)).toEqual(['0', '2', '4', '7', '9']);
  const toggle = f.host.querySelector<HTMLButtonElement>('.wardrobe-toggle')!;
  toggle.click(); f.slots()[5]!.click();
  await vi.waitFor(() => expect(f.slots()[5]!.getAttribute('aria-pressed')).toBe('true'));
  toggle.click(); finishFirst('old-image'); await first;
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({ name: 'Kiki', available: true, wardrobeName: 'Look 12', wardrobeSlot: 12, image: 'snapshot-12' });
  expect(f.slots()).toHaveLength(5);
});

it('retains an existing photo on metadata-only saves and requires confirmation to remove a card', async () => {
  const card: SwipeCard = { memberNumber: 19, name: 'Existing', available: false, imageVersion: 'saved', background: 'ParkNight', revision: 2,
    lookSource: 'photo', wardrobeName: null, wardrobeSlot: null, languages: [], tags: [], bio: '' };
  const f = editor(card);
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({name: 'Existing', available: false, lookSource: 'photo', background: 'ParkNight'});
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('image');
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  f.host.querySelector<HTMLButtonElement>('.textbtn')!.click();
  expect(f.onRemove).not.toHaveBeenCalled();
  f.host.querySelector<HTMLButtonElement>('.actions button:last-child')!.click();
  expect(f.onRemove).toHaveBeenCalledOnce();
});

it('does not submit a stale draft after a Club account switch', async () => {
  vi.spyOn(wardrobe, 'captureCurrentLook').mockResolvedValue('current-snapshot');
  const f = editor();
  await vi.waitFor(() => expect(f.host.querySelector('.wardrobe-chosen')?.textContent).toContain('Current Club look'));
  vi.stubGlobal('Player', { Name: 'Other', MemberNumber: 20 });
  f.save();
  expect(f.onSave).not.toHaveBeenCalled();
});
