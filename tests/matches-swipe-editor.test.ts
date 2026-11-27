// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as wardrobe from '../src/bc/matches-wardrobe';
import type { SwipeCard, SwipeCardDraft } from '../src/cloud/matches-swipe';
import { mountMatchesSwipeEditor, type MatchesSwipeEditorOptions } from '../src/modules/platform-shell/matches-swipe-editor';

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

function editor(card: SwipeCard | null = null, loadImage = async (): Promise<Blob | null> => null, options: Partial<MatchesSwipeEditorOptions> = {}) {
  vi.stubGlobal('Player', { Name: 'Kiki', MemberNumber: 19 });
  const host = document.createElement('div');
  document.body.append(host);
  const onSave = vi.fn(async (_draft: SwipeCardDraft) => {});
  const onRemove = vi.fn(async () => {});
  mounted.push(mountMatchesSwipeEditor(host, { card, memberNumber: 19, loadImage, onSave, onRemove, ...options }));
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
  const caption = f.host.querySelector<HTMLElement>('.wardrobe-chosen')!;
  expect(caption.hidden).toBe(true);
  toggle.click(); finishFirst(portrait('old-image')); await first;
  expect(caption.hidden).toBe(false);
  expect(caption.textContent).toBe('Selected · Look 12');
  toggle.click();
  expect(caption.hidden).toBe(true);
  expect(f.slots()[5]!.getAttribute('aria-pressed')).toBe('true');
  toggle.click();
  f.save();
  await vi.waitFor(() => expect(f.onSave).toHaveBeenCalledOnce());
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({ name: 'Kiki', available: true, wardrobeName: 'Look 12', wardrobeSlot: 12, image: 'snapshot-12' });
  expect(f.slots()).toHaveLength(5);
});

it('compares a restored portrait and its hidden Wardrobe slot at the same thumbnail dimensions', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(Array.from({length: 8}, (_, slot) => ({slot, name: 'Look ' + slot})));
  vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => portrait('look-' + slot));
  vi.spyOn(HTMLImageElement.prototype, 'decode').mockResolvedValue();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:saved');
  const comparedSizes: number[][] = [];
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(function(this: HTMLCanvasElement) {
    const brush = {
      fillRect() {},
      drawImage: (source: CanvasImageSource) => {
        if (this.width === 44) comparedSizes.push(source instanceof HTMLCanvasElement ? [source.width, source.height] : []);
      },
      getImageData: () => ({data: new Uint8ClampedArray(4)}),
    };
    return brush as unknown as CanvasRenderingContext2D;
  });
  const f = editor({...saved, lookSource: 'wardrobe', wardrobeName: 'Look 7', wardrobeSlot: 7}, async () => new Blob());
  await vi.waitFor(() => expect(f.host.querySelector('.wardrobe-chosen')?.textContent).toBe('Selected · Look 7'));
  expect(f.slots()).toHaveLength(5);
  expect(comparedSizes).toEqual([[128, 256], [128, 256]]);
});

it('retains an existing photo on metadata-only saves and requires confirmation to remove a card', async () => {
  const f = editor(saved);
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({name: 'Existing', available: false, lookSource: 'photo', background: 'ParkNight'});
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('image');
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  const remove = f.host.querySelector<HTMLButtonElement>('.savebar .editor-remove')!;
  remove.click();
  expect(f.onRemove).not.toHaveBeenCalled();
  f.save();
  expect(f.onSave).toHaveBeenCalledTimes(1);
  const keep = [...f.host.querySelectorAll('button')].find(button => button.textContent === 'Keep card')!;
  expect(document.activeElement).toBe(keep);
  keep.click();
  expect(document.activeElement).toBe(remove);
  remove.click();
  f.host.querySelector<HTMLButtonElement>('.editor-tools .editor-remove')!.click();
  expect(f.onRemove).toHaveBeenCalledOnce();
});

it('dismisses the inline removal confirmation with Escape and returns focus without closing the outer UI', () => {
  const f = editor({...saved, imageVersion: null});
  const remove = f.host.querySelector<HTMLButtonElement>('.savebar .editor-remove')!;
  const keep = [...f.host.querySelectorAll('button')].find(button => button.textContent === 'Keep card')!;
  const outer = vi.fn();
  f.host.addEventListener('keydown', outer);
  const escape = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  remove.click();
  const nested = document.createElement('dialog');
  nested.open = true;
  keep.parentElement!.append(nested);
  nested.dispatchEvent(escape());
  expect(outer).toHaveBeenCalledOnce();
  nested.remove();
  expect(keep.dispatchEvent(escape())).toBe(false);
  expect(outer).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe(remove);
  expect(remove.closest<HTMLElement>('.savebar')!.hidden).toBe(false);
  expect(f.onRemove).not.toHaveBeenCalled();
  expect(remove.dispatchEvent(escape())).toBe(true);
  expect(outer).toHaveBeenCalledTimes(2);
});

it.each([
  { removing: false, pending: 'Saving…', fallback: 'could not be saved' },
  { removing: true, pending: 'Removing…', fallback: 'could not be removed' },
])('shows $pending while busy and restores the action for retry after rejection', async ({ removing, pending, fallback }) => {
  const f = editor({...saved, imageVersion: null});
  const form = f.host.querySelector('form')!;
  const action = removing ? f.onRemove : f.onSave;
  let fail!: (error: Error) => void;
  action.mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; }));
  if (removing) f.host.querySelector<HTMLButtonElement>('.savebar .editor-remove')!.click();
  const button = f.host.querySelector<HTMLButtonElement>(removing ? '.editor-tools .editor-remove' : '[type="submit"]')!;
  const status = f.host.querySelector<HTMLElement>('.setupPanel > [role="status"]')!;
  const label = button.textContent;
  button.focus();
  button.click();
  expect(button.textContent).toBe(pending);
  expect(button.disabled).toBe(true);
  expect([...button.parentElement!.querySelectorAll('button')].every(control => control.disabled)).toBe(true);
  expect(form.inert).toBe(true);
  expect(status.textContent).toBe(pending);
  expect(document.activeElement).toBe(status);
  expect(status.getAttribute('aria-live')).toBe('off');
  expect(status.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))).toBe(false);
  button.click();
  f.save();
  expect(action).toHaveBeenCalledOnce();
  fail(new Error('offline'));
  await vi.waitFor(() => expect(form.inert).toBe(false));
  expect(status.textContent).toBe('');
  expect(form.querySelector('[role="alert"]')?.textContent).toContain(fallback);
  expect(button.textContent).toBe(label);
  expect(button.disabled).toBe(false);
  expect(document.activeElement).toBe(button);
  button.click();
  await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(2));
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
  expect(tile.querySelector('.outfit-image [data-icon="refresh"]')).not.toBeNull();
  expect(tile.getAttribute('aria-label')).toBe('Saved');
  const retry = f.host.querySelector<HTMLButtonElement>('.wardrobe-retry')!;
  expect(retry.hidden).toBe(false);
  retry.focus();
  retry.click();
  expect(document.activeElement).toBe(tile);
  expect(tile.querySelector('.outfit-image [data-icon="clock"]')).not.toBeNull();
  await vi.waitFor(() => expect(tile.dataset.preview).toBe('ready'));
  expect(capture).toHaveBeenCalledTimes(2);
  expect(capture.mock.calls.map(call => call[3])).toEqual([false, true]);
  expect(tile.querySelector('canvas')?.dataset.look).toBe('ready');
  expect(tile.querySelector('svg')).toBeNull();
  expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('ready');
  expect(retry.hidden).toBe(true);
  expect(f.slots()[0]!.getAttribute('aria-pressed')).toBe('true');
});

it('keeps a valid full portrait when thumbnail drawing fails and rebuilds only the missing thumbnail on retry', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue([{slot: 2, name: 'Saved'}]);
  const capture = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockResolvedValue(portrait('real outfit'));
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementationOnce(() => { throw new Error('No drawing surface'); });
  const f = editor();
  const tile = f.slots()[0]!;
  const retry = f.host.querySelector<HTMLButtonElement>('.wardrobe-retry')!;
  await vi.waitFor(() => expect(tile.dataset.preview).toBe('failed'));
  expect(f.host.querySelector<HTMLCanvasElement>('canvas.figure')?.dataset.look).toBe('real outfit');
  expect(retry.hidden).toBe(false);
  retry.click();
  await vi.waitFor(() => expect(tile.dataset.preview).toBe('ready'));
  expect(capture).toHaveBeenCalledOnce();
  expect(tile.querySelector('canvas')?.dataset.look).toBe('real outfit');
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
  const calls = render.mock.calls.length;
  f.slots()[1]!.click();
  await vi.waitFor(() => expect(f.slots()[1]!.getAttribute('aria-pressed')).toBe('true'));
  const frame = f.host.querySelector('canvas.figure')!;
  expect(f.slots()[1]!.querySelector('canvas')).not.toBe(frame);
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

it('preserves the confirmed portrait and offers a retry when a previously drawn tile must be rendered again', async () => {
  vi.spyOn(wardrobe, 'readClubWardrobe').mockReturnValue(Array.from({length: 7}, (_, i) => ({slot: i * 2 + 1, name: 'Outfit ' + i})));
  const render = vi.spyOn(wardrobe, 'renderWardrobeSlot').mockImplementation(async slot => portrait('look-' + slot));
  const f = editor();
  await vi.waitFor(() => expect(f.slots()[0]!.getAttribute('aria-pressed')).toBe('true'));
  const original = f.host.querySelector('canvas.figure');
  f.host.querySelector<HTMLButtonElement>('.wardrobe-toggle')!.click();
  await vi.waitFor(() => expect(f.slots().every(tile => tile.dataset.preview === 'ready')).toBe(true));
  render.mockResolvedValueOnce(null);
  f.slots()[1]!.click();
  await vi.waitFor(() => expect(f.host.querySelector('.form-error')?.textContent).toContain('previous picture is still selected'));
  expect(f.host.querySelector('canvas.figure')).toBe(original);
  expect(f.slots().filter(tile => tile.getAttribute('aria-pressed') === 'true')).toEqual([f.slots()[0]]);
  expect(f.slots()[1]!.dataset.preview).toBe('ready');
  const retry = f.host.querySelector<HTMLButtonElement>('.wardrobe-retry')!;
  expect(retry.hidden).toBe(false);
  f.save();
  await vi.waitFor(() => expect(f.onSave).toHaveBeenCalledOnce());
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({wardrobeSlot: 1, image: 'look-1'});
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  retry.click();
  await vi.waitFor(() => expect(f.slots()[1]!.getAttribute('aria-pressed')).toBe('true'));
  expect(retry.hidden).toBe(true);
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

it('browses tagged native room backgrounds with search and pagination on a native-only Cloud', async () => {
  vi.stubGlobal('BackgroundsList', Array.from({length: 15}, (_, i) => ({Name: 'Room' + i, Tag: [i % 2 ? 'Outside' : 'Inside']})));
  const f = editor({...saved, imageVersion:null, background:'Room1'});
  const search = f.host.querySelector<HTMLInputElement>('[aria-label="Find background"]')!;
  const grid = f.host.querySelector('.kl-room-background-grid')!;
  expect(grid.children).toHaveLength(12);
  expect([...grid.querySelectorAll('img')].every(image => image.loading === 'lazy')).toBe(true);
  const section = f.host.querySelector('section[aria-label="Background"]')!;
  expect(section.querySelector('h3')?.textContent).toBe('Background');
  expect(section.contains(search)).toBe(true);
  expect(search.closest('details')).toBeNull();
  expect(f.host.querySelector('[aria-label="Background image"]')).toBeNull();
  search.value = 'Room14';
  search.dispatchEvent(new Event('input'));
  const target = grid.querySelector<HTMLButtonElement>('button')!;
  expect(target.querySelector('img')?.getAttribute('src')).toBe('Backgrounds/Room14.jpg');
  target.click();
  expect(target.getAttribute('aria-pressed')).toBe('true');
  expect(search.value).toBe('Room14');
  expect(grid.querySelector('button')).toBe(target);
  expect(f.host.querySelector('img.bg')?.getAttribute('src')).toBe('Backgrounds/Room14.jpg');
  f.save();
  expect(f.onSave.mock.calls[0]?.[0].background).toBe('Room14');
  expect(f.onSave.mock.calls[0]?.[0]).not.toHaveProperty('backgroundUrl');
});

it('keeps a missing Club background selectable and restores the preview when a working scene is chosen', () => {
  const f = editor({...saved, imageVersion: null});
  const tile = f.host.querySelector<HTMLButtonElement>('[data-background="ParkNight"]')!;
  const room = f.host.querySelector<HTMLImageElement>('.scene .bg')!;
  tile.querySelector('img')!.dispatchEvent(new Event('error'));
  room.dispatchEvent(new Event('error'));
  expect(tile.querySelector('.kl-room-background-placeholder')).not.toBeNull();
  expect(tile.getAttribute('aria-pressed')).toBe('true');
  expect(room.hidden).toBe(true);
  expect(f.host.querySelector('.where')?.textContent).toBe('Park Night · Preview unavailable');
  f.host.querySelector<HTMLButtonElement>('[data-background="CosyChalet"]')!.click();
  room.dispatchEvent(new Event('load'));
  expect(room.hidden).toBe(false);
  expect(f.host.querySelector('.where')?.textContent).toBe('Cosy Chalet');
});

it('previews a validated custom link through the media loader and clears it when the player chooses vanilla', async () => {
  const release = vi.fn();
  const loadBackground = vi.fn(async () => ({url:'blob:custom-room', release}));
  const f = editor({...saved,imageVersion:null},undefined,{customBackgrounds:true,loadBackground});
  const field = f.host.querySelector<HTMLInputElement>('[aria-label="Background image"]')!;
  field.value = 'https://images.example.org/scene.webp?ref=1#fragment';
  field.dispatchEvent(new Event('change'));
  expect(loadBackground.mock.calls[0]).toEqual(['https://images.example.org/scene.webp?ref=1',expect.any(AbortSignal)]);
  await vi.waitFor(() => expect(f.host.querySelector('img.bg')?.getAttribute('src')).toBe('blob:custom-room'));
  f.host.querySelector('img.bg')!.dispatchEvent(new Event('load'));
  await vi.waitFor(() => expect(f.host.querySelector('.where')?.textContent).toContain('Custom background'));
  expect(release).toHaveBeenCalledOnce();
  expect(f.host.querySelector('img.bg')?.getAttribute('referrerpolicy')).toBe('no-referrer');
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({background:'ParkNight',backgroundUrl:'https://images.example.org/scene.webp?ref=1'});
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  f.host.querySelector<HTMLButtonElement>('[data-background="CosyChalet"]')!.click();
  expect(field.value).toBe('');
  expect(f.host.querySelector('img.bg')?.getAttribute('src')).toBe('Backgrounds/CosyChalet.jpg');
  f.save();
  expect(f.onSave.mock.calls[1]?.[0]).toMatchObject({background:'CosyChalet',backgroundUrl:null});
});

it('rejects incompatible links, cancels stale gallery results, and submits only the uploaded background the player kept', async () => {
  let resolveGallery!: (url:string)=>void;
  const pickBackground = vi.fn((_signal:AbortSignal)=>new Promise<string>(resolve=>{resolveGallery=resolve;}));
  const uploadBackground = vi.fn(async (_file:File,_signal:AbortSignal)=>'https://images.example.org/uploads/nature.jpg');
  const f = editor({...saved,imageVersion:null},undefined,{customBackgrounds:true,pickBackground,uploadBackground});
  const field = f.host.querySelector<HTMLInputElement>('[aria-label="Background image"]')!;
  field.value = 'https://127.0.0.1/private.jpg';
  f.save();
  expect(f.onSave).not.toHaveBeenCalled();
  expect(field.validationMessage).toContain('public HTTPS');
  f.host.querySelector<HTMLButtonElement>('button[aria-label="Choose from gallery"]')!.click();
  const pending = pickBackground.mock.calls[0]![0];
  f.host.querySelector<HTMLButtonElement>('[data-background="BeachSunset"]')!.click();
  expect(pending.aborted).toBe(true);
  resolveGallery('https://images.example.org/obsolete.jpg');
  await Promise.resolve();
  expect(field.value).toBe('');
  const input = f.host.querySelector<HTMLInputElement>('input[aria-label="Upload background image"]')!;
  const file = new File(['picture'], 'nature.jpg', {type:'image/jpeg'});
  Object.defineProperty(input,'files',{value:[file]});
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => expect(field.value).toBe('https://images.example.org/uploads/nature.jpg'));
  expect(uploadBackground.mock.calls[0]).toEqual([file,expect.any(AbortSignal)]);
  f.save();
  expect(f.onSave.mock.calls[0]?.[0]).toMatchObject({background:'BeachSunset',backgroundUrl:field.value});
});

it('explains the fallback and retries a failed custom preview without uploading again', async () => {
  const loadBackground = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({url:'blob:retry',release:vi.fn()});
  const uploadBackground = vi.fn();
  const f = editor({...saved,imageVersion:null,backgroundUrl:'https://images.example.org/stored.jpg'},undefined,
    {customBackgrounds:true,loadBackground,uploadBackground});
  expect(f.host.textContent).toContain('Uploads use the lifetime in Chat settings.');
  await vi.waitFor(()=>expect(f.host.textContent).toContain('Saving keeps the link'));
  const retry=[...f.host.querySelectorAll('button')].find(b=>b.textContent==='Retry preview')!;
  expect(retry.hidden).toBe(false);
  expect(f.host.querySelector('img.bg')?.getAttribute('src')).toBe('Backgrounds/ParkNight.jpg');
  f.save();
  expect(f.onSave).toHaveBeenCalledOnce();
  expect(f.onSave.mock.calls[0]![0]).not.toHaveProperty('backgroundUrl'); // metadata-only save preserves the existing URL
  await vi.waitFor(() => expect(f.host.querySelector('form')!.inert).toBe(false));
  retry.click();
  await vi.waitFor(()=>expect(f.host.querySelector('img.bg')?.getAttribute('src')).toBe('blob:retry'));
  f.host.querySelector('img.bg')!.dispatchEvent(new Event('load'));
  await vi.waitFor(()=>expect(f.host.querySelector('.where')?.textContent).toContain('Custom background'));
  expect(retry.hidden).toBe(true);
  expect(uploadBackground).not.toHaveBeenCalled();
});
