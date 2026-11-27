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

const saved: SwipeCard = { memberNumber: 19, name: 'Existing', available: false, imageVersion: 'saved', background: 'ParkNight', revision: 2,
  lookSource: 'photo', wardrobeName: null, wardrobeSlot: null, languages: [], tags: [], bio: '' };

function editor(card: SwipeCard | null = null, loadImage = async (): Promise<Blob | null> => null) {
  vi.stubGlobal('Player', { Name: 'Kiki', MemberNumber: 19 });
  const host = document.createElement('div');
  document.body.append(host);
  const onSave = vi.fn(async (_draft: SwipeCardDraft) => {});
  const onRemove = vi.fn(async () => {});
  mounted.push(mountMatchesSwipeEditor(host, { card, memberNumber: 19, loadImage, onSave, onRemove }));
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
  const f = editor(saved);
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({name: 'Existing', available: false, lookSource: 'photo', background: 'ParkNight'});
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('image');
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  f.host.querySelector<HTMLButtonElement>('.textbtn')!.click();
  expect(f.onRemove).not.toHaveBeenCalled();
  f.host.querySelector<HTMLButtonElement>('.actions button:last-child')!.click();
  expect(f.onRemove).toHaveBeenCalledOnce();
});

it('does not silently attach a picture when editing a saved card with no portrait', async () => {
  const capture = vi.spyOn(wardrobe, 'captureCurrentLook').mockResolvedValue('existing-look');
  const f = editor({...saved, lookSource: 'none', imageVersion: null});
  await Promise.resolve();
  f.save();
  expect(capture).not.toHaveBeenCalled();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({lookSource: 'none'});
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('image');
});

it('refreshes the current look on creation and keeps the exact submitted image for a failed-save retry', async () => {
  const capture = vi.spyOn(wardrobe, 'captureCurrentLook').mockResolvedValueOnce('preview').mockResolvedValue('new-outfit');
  const f = editor();
  f.onSave.mockRejectedValueOnce(new Error('Connection interrupted.'));
  await vi.waitFor(() => expect(f.host.querySelector<HTMLImageElement>('.figure')?.getAttribute('src')).toBe('preview'));
  f.save();
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toBe('Connection interrupted.'));
  f.save();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(f.onSave.mock.calls.map(([draft]) => draft.image)).toEqual(['new-outfit', 'new-outfit']);
});

it('fills the thumbnail, chosen state and large preview after a cold failed slot is retried', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([{slot: 2, name: 'Saved'}]);
  const capture = vi.spyOn(wardrobe, 'captureWardrobeSlot').mockRejectedValueOnce(new Error('Renderer unavailable')).mockResolvedValueOnce('ready');
  const f = editor();
  await new Promise<void>(done => setTimeout(done, 0));
  expect(f.host.querySelector('.form-error')?.textContent).toContain('could not be previewed');
  f.slots()[0]!.click();
  await new Promise<void>(done => setTimeout(done, 0));
  expect(capture).toHaveBeenCalledTimes(2);
  expect(f.slots()[0]!.querySelector('img')?.getAttribute('src')).toBe('ready');
  expect(f.host.querySelector('.figure')?.getAttribute('src')).toBe('ready');
  expect(f.slots()[0]!.getAttribute('aria-pressed')).toBe('true');
});

it('offers retry on a null saved-image read and ignores its late result after cancellation', async () => {
  let finish!: (blob: Blob) => void;
  const load = vi.fn<() => Promise<Blob | null>>().mockResolvedValueOnce(null)
    .mockReturnValueOnce(new Promise(resolve => {finish = resolve;}));
  const create = vi.spyOn(URL, 'createObjectURL');
  const f = editor(saved, load);
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toContain('could not be loaded'));
  [...f.host.querySelectorAll('button')].find(button => button.textContent === 'Retry saved picture')!.click();
  mounted.pop()!();
  finish(new Blob(['abc']));
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
  expect(f.host.childElementCount).toBe(0);
});

it('does not submit a stale draft after a Club account switch', async () => {
  vi.spyOn(wardrobe, 'captureCurrentLook').mockResolvedValue('current-snapshot');
  const f = editor();
  await vi.waitFor(() => expect(f.host.querySelector('.wardrobe-chosen')?.textContent).toContain('Current Club look'));
  vi.stubGlobal('Player', { Name: 'Other', MemberNumber: 20 });
  f.save();
  expect(f.onSave).not.toHaveBeenCalled();
});

it('limits simultaneous cold tile renders, prioritizes direct selection, and stops scheduling after unmount', async () => {
  const slots = Array.from({length: 12}, (_, slot) => ({slot, name: 'Look ' + slot}));
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(slots);
  const pending = new Map<number, (value: string | null) => void>();
  const capture = vi.spyOn(wardrobe, 'captureWardrobeSlot').mockImplementation(slot => new Promise(done => pending.set(slot, done)));
  const f = editor();
  expect(capture.mock.calls.map(([slot]) => slot)).toEqual([0,1]);
  f.slots()[4]!.click();
  expect(capture.mock.calls.map(([slot]) => slot)).toEqual([0,1,4]);
  pending.get(4)!('chosen');
  await vi.waitFor(() => expect(f.host.querySelector<HTMLImageElement>('.figure')?.getAttribute('src')).toBe('chosen'));
  mounted.pop()!();
  pending.get(0)!(null); pending.get(1)!(null);
  await Promise.resolve(); await Promise.resolve();
  expect(capture).toHaveBeenCalledTimes(3);
});
