// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as wardrobe from '../src/bc/matches-wardrobe';
import type { SwipeCard, SwipeCardDraft } from '../src/cloud/matches-swipe';
import { mountMatchesSwipeEditor } from '../src/modules/platform-shell/matches-swipe-editor';

const mounted: Array<() => void> = [];
function portrait(name: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 350;
  canvas.height = 700;
  canvas.dataset.look = name;
  return canvas;
}
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(this: HTMLCanvasElement) {
    const brush: Pick<CanvasRenderingContext2D, 'drawImage'> = {
      drawImage: source => { if (source instanceof HTMLCanvasElement) this.dataset.look = source.dataset.look; },
    };
    return brush as CanvasRenderingContext2D;
  });
  vi.spyOn(wardrobe, 'encodeMatchesImage').mockImplementation(async canvas => canvas.dataset.look ?? null);
});
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
  let finishFirst!: (frame: HTMLCanvasElement) => void;
  const first = new Promise<HTMLCanvasElement>(resolve => { finishFirst = resolve; });
  vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => slot === 0 ? first : portrait('snapshot-' + slot));
  const f = editor();
  expect(f.slots().map(b => b.dataset.slot)).toEqual(['0', '2', '4', '7', '9']);
  const toggle = f.host.querySelector<HTMLButtonElement>('.wardrobe-toggle')!;
  toggle.click(); f.slots()[5]!.click();
  await vi.waitFor(() => expect(f.slots()[5]!.getAttribute('aria-pressed')).toBe('true'));
  toggle.click(); finishFirst(portrait('old-image')); await first;
  f.save();
  await vi.waitFor(() => expect(f.onSave).toHaveBeenCalledOnce());
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
  const capture = vi.spyOn(wardrobe, 'renderCurrentLook').mockResolvedValue(portrait('existing-look'));
  const f = editor({...saved, lookSource: 'none', imageVersion: null});
  await Promise.resolve();
  f.save();
  expect(capture).not.toHaveBeenCalled();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({lookSource: 'none'});
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('image');
});

it('refreshes the current look on creation and keeps the exact submitted image for a failed-save retry', async () => {
  const capture = vi.spyOn(wardrobe, 'renderCurrentLook').mockResolvedValueOnce(portrait('preview')).mockResolvedValue(portrait('new-outfit'));
  const f = editor();
  f.onSave.mockRejectedValueOnce(new Error('Connection interrupted.'));
  await vi.waitFor(() => expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('preview'));
  f.save();
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toBe('Connection interrupted.'));
  f.save();
  expect(capture).toHaveBeenCalledTimes(2);
  expect(f.onSave.mock.calls.map(([draft]) => draft.image)).toEqual(['new-outfit', 'new-outfit']);
});

it('fills the thumbnail, chosen state and large preview after a cold failed slot is retried', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([{slot: 2, name: 'Saved'}]);
  const capture = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockRejectedValueOnce(new Error('Renderer unavailable')).mockResolvedValueOnce(portrait('ready'));
  const f = editor();
  await new Promise<void>(done => setTimeout(done, 0));
  expect(f.host.querySelector('.form-error')?.textContent).toContain('could not be previewed');
  const tile = f.slots()[0]!;
  expect(tile.dataset.preview).toBe('failed');
  expect(tile.querySelector('.outfit-image')?.childElementCount).toBe(0);
  expect(tile.getAttribute('aria-label')).toBe('Saved');
  const retry = f.host.querySelector<HTMLButtonElement>('.wardrobe-retry')!;
  expect(retry.hidden).toBe(false);
  retry.click();
  await vi.waitFor(() => expect(tile.dataset.preview).toBe('ready'));
  expect(capture).toHaveBeenCalledTimes(2);
  expect(tile.querySelector('canvas')?.dataset.look).toBe('ready');
  expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('ready');
  expect(retry.hidden).toBe(true);
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
  vi.spyOn(wardrobe, 'renderCurrentLook').mockResolvedValue(portrait('current-snapshot'));
  const f = editor();
  await vi.waitFor(() => expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('current-snapshot'));
  vi.stubGlobal('Player', { Name: 'Other', MemberNumber: 20 });
  f.save();
  expect(f.onSave).not.toHaveBeenCalled();
});

it('limits simultaneous cold tile renders, prioritizes direct selection, and stops scheduling after unmount', async () => {
  const slots = Array.from({length: 12}, (_, slot) => ({slot, name: 'Look ' + slot}));
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(slots);
  const pending = new Map<number, (value: HTMLCanvasElement | null) => void>();
  const capture = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(slot => new Promise(done => pending.set(slot, done)));
  const f = editor();
  expect(capture.mock.calls.map(([slot]) => slot)).toEqual([0,1]);
  f.slots()[4]!.click();
  expect(capture.mock.calls.map(([slot]) => slot)).toEqual([0,1,4]);
  pending.get(4)!(portrait('chosen'));
  await vi.waitFor(() => expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('chosen'));
  mounted.pop()!();
  pending.get(0)!(null); pending.get(1)!(null);
  await Promise.resolve(); await Promise.resolve();
  expect(capture).toHaveBeenCalledTimes(3);
});

it('shows the first five native canvases and additional outfits without replacing the original tiles or encoding previews', async () => {
  const slots = Array.from({length: 9}, (_, index) => ({slot: index * 2, name: 'Saved ' + (index + 1)}));
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(slots);
  const render = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => portrait('native-' + slot));
  const f = editor();
  const firstRow = f.slots();
  expect(firstRow).toHaveLength(5);
  await vi.waitFor(() => expect(firstRow.every(tile => tile.querySelector('canvas'))).toBe(true));
  expect(f.host.querySelector('.missing-look')).toBeNull();
  expect(f.host.querySelector<HTMLElement>('.wardrobe-chosen')!.hidden).toBe(true);
  const toggle = f.host.querySelector<HTMLButtonElement>('.wardrobe-toggle')!;
  toggle.click();
  await vi.waitFor(() => expect(f.slots().every(tile => tile.querySelector('canvas'))).toBe(true));
  f.slots().forEach((tile, index) => {
    expect(tile.textContent).toBe('');
    expect(tile.hasAttribute('title')).toBe(false);
    expect(tile.getAttribute('aria-label')).toBe(slots[index]!.name);
    expect(tile.querySelector('svg, img')).toBeNull();
    const canvas = tile.querySelector('canvas')!;
    expect(canvas.dataset.look).toBe('native-' + slots[index]!.slot);
    expect(canvas.width / canvas.height).toBe(.5);
    expect(tile.getAttribute('aria-pressed')).toBe(String(index === 0));
    if (index < 5) expect(tile).toBe(firstRow[index]);
  });
  expect(render).toHaveBeenCalledTimes(slots.length);
  toggle.click();
  toggle.click();
  expect(render).toHaveBeenCalledTimes(slots.length);
  expect(wardrobe.encodeMatchesImage).not.toHaveBeenCalled();
});

it('keeps the selected full-size native frame and all thumbnails visible across a failed export and retry', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([{slot: 4, name: 'First'}, {slot: 9, name: 'Second'}]);
  const render = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => portrait('native-' + slot));
  const encode = vi.mocked(wardrobe.encodeMatchesImage).mockRejectedValueOnce(new DOMException('Blocked', 'SecurityError'));
  const f = editor();
  await vi.waitFor(() => expect(f.slots().every(tile => tile.dataset.preview === 'ready')).toBe(true));
  f.slots()[1]!.click();
  await vi.waitFor(() => expect(f.slots()[1]!.getAttribute('aria-pressed')).toBe('true'));
  const frame = f.host.querySelector('canvas.figure')!;
  expect(f.slots()[1]!.querySelector('canvas')).not.toBe(frame);
  const calls = render.mock.calls.length;
  f.save();
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toContain('could not be saved as an image'));
  expect(f.onSave).not.toHaveBeenCalled();
  expect(f.host.querySelector('canvas.figure')).toBe(frame);
  expect(f.slots().every(tile => tile.dataset.preview === 'ready')).toBe(true);
  f.save();
  await vi.waitFor(() => expect(f.onSave).toHaveBeenCalledOnce());
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({wardrobeSlot: 9, image: 'native-9'});
  expect(encode.mock.calls.map(([canvas]) => canvas)).toEqual([frame, frame]);
  expect(render).toHaveBeenCalledTimes(calls);
});

it('preserves the previous confirmed portrait and selection when another native outfit fails', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([{slot: 1, name: 'First'}, {slot: 3, name: 'Second'}]);
  const render = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => portrait('look-' + slot));
  const f = editor();
  await vi.waitFor(() => expect(f.slots()[0]!.getAttribute('aria-pressed')).toBe('true'));
  const original = f.host.querySelector('canvas.figure');
  render.mockResolvedValueOnce(null);
  f.slots()[1]!.click();
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toContain('previous picture is still selected'));
  expect(f.host.querySelector('canvas.figure')).toBe(original);
  expect(f.slots().map(tile => tile.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  f.save();
  await vi.waitFor(() => expect(f.onSave).toHaveBeenCalledOnce());
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({wardrobeSlot: 1, image: 'look-1'});
});

it('coalesces rapid taps behind one priority render and displays the final tapped outfit', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(Array.from({length: 8}, (_, slot) => ({slot, name: 'Look ' + slot})));
  const pending = new Map<number, (value: HTMLCanvasElement) => void>();
  const render = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(slot => new Promise(done => pending.set(slot, done)));
  const f = editor();
  f.host.querySelector<HTMLButtonElement>('.wardrobe-toggle')!.click();
  for (const index of [4, 5, 7, 3]) f.slots()[index]!.click();
  expect(render.mock.calls.map(([slot]) => slot)).toEqual([0, 1, 4]);
  pending.get(4)!(portrait('superseded'));
  await vi.waitFor(() => expect(render.mock.calls.map(([slot]) => slot)).toEqual([0, 1, 4, 3]));
  pending.get(3)!(portrait('chosen'));
  await vi.waitFor(() => expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('chosen'));
  expect(f.slots()[3]!.getAttribute('aria-pressed')).toBe('true');
});
