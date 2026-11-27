// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readClubWardrobe, renderCurrentLook, renderWardrobeSlot } from '../src/bc/matches-wardrobe';

type Host = NonNullable<Parameters<typeof renderWardrobeSlot>[2]>;
type Character = NonNullable<Host['Player']>;

const signal = () => new AbortController().signal;
const canvas = () => document.createElement('canvas');
const shirt = {Name: 'Cardigan', Group: 'Cloth', Color: ['#5489ab']};
const bitmap = {width: 500, height: 1000} as ImageBitmap;

function character(id: string) {
  return { CharacterID: id, MemberNumber: 71, Name: id, Canvas: canvas(), MustDraw: false, Appearance: [],
    IsPlayer: () => id === 'player' } as unknown as Character;
}

function club() {
  const player = character('player');
  player.Wardrobe = [null, [structuredClone(shirt)]];
  player.WardrobeCharacterNames = ['', 'Blue cardigan'];
  const gallery = {selectedCharacter: null as Character|null, canvasCache: new Map([['live grid', 1]]), drawGeneration: 12};
  const loaded = vi.fn<NonNullable<Host['WardrobeFastLoad']>>((preview, slot, update, options) => {
    if (!gallery.selectedCharacter) return; // Native R132 and R134 silently return before opening Wardrobe.
    expect(preview.CharacterID).toMatch(/^wardrobe-/);
    expect(slot).toBe(1);
    expect(update).toBe(false);
    expect(options.Appearance).toEqual(player.Wardrobe![1]);
    expect(options.Appearance).not.toBe(player.Wardrobe![1]);
    preview.Appearance = [{Asset:{Name: options.Appearance[0]!.Name}}] as Character['Appearance'];
    gallery.canvasCache.clear();
    gallery.drawGeneration++;
  });
  const draw = vi.fn();
  const dynamic = vi.fn();
  const transforms = { Rotation: 13 };
  const cache = vi.fn<Host['DrawGetImage']>().mockReturnValue(bitmap);
  const host = {
    Player: player, Wardrobe: gallery, WardrobeCharacter: [], WardrobeSize: 24,
    CharacterLoadSimple: vi.fn(character), CharacterDelete: vi.fn(), WardrobeFastLoad: loaded,
    CommonDrawAppearanceBuild: vi.fn<Host['CommonDrawAppearanceBuild']>((_character, cb) => {
      cb.drawImage('Cardigan-layer', 9, 7, {TextureAlphaMask:[{Url:'Cardigan-mask'}]});
      cb.drawCanvas(canvas(), 12, 10, [], [], transforms);
    }),
    DrawGetImage: cache, DrawImageCanvas: draw, DrawCanvas: dynamic,
    DrawCharacterSegment: vi.fn((c: Character) => c.Canvas),
  } as unknown as Host;
  return {player, gallery, loaded, cache, draw, dynamic, host, transforms};
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    drawImage: vi.fn(), clearRect: vi.fn(),
    getImageData: () => { throw new Error('Canvas readback denied'); },
  } as unknown as CanvasRenderingContext2D));
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => { throw new Error('Canvas export denied'); });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it('paints warm R134 ImageBitmap layers directly, even with readback and export disabled', async () => {
  const f = club();
  const oldCache = f.gallery.canvasCache;
  expect(readClubWardrobe(f.host)).toEqual([{slot:1, name:'Blue cardigan'}]);
  const result = await renderWardrobeSlot(1, signal(), f.host);
  expect(result).toBeInstanceOf(HTMLCanvasElement);
  expect([result?.width, result?.height]).toEqual([350, 700]);
  expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
  expect(f.draw).toHaveBeenCalledTimes(1);
  expect(f.dynamic.mock.calls[0]?.at(-1)).toBe(f.transforms);
  expect(f.gallery).toEqual({selectedCharacter:null, canvasCache:oldCache, drawGeneration:12});
  expect([...oldCache.keys()]).toEqual(['live grid']);
  expect(f.player.Wardrobe?.[1]).toEqual([shirt]);
  expect(f.host.CharacterDelete).toHaveBeenCalledOnce();
});

it('waits for both the R134 bitmap and mask when the first native reads are undefined', async () => {
  vi.useFakeTimers();
  const f = club();
  let coat = false;
  let mask = false;
  f.cache.mockImplementation(url => (url.endsWith('mask') ? mask : coat) ? bitmap : undefined);
  const pending = renderWardrobeSlot(1, signal(), f.host);
  await vi.advanceTimersByTimeAsync(60);
  coat = true;
  await vi.advanceTimersByTimeAsync(60);
  expect(f.draw).not.toHaveBeenCalled();
  mask = true;
  await vi.advanceTimersByTimeAsync(60);
  expect(await pending).toBeInstanceOf(HTMLCanvasElement);
  expect(f.draw).toHaveBeenCalledOnce();
});

it('handles the R132 HTMLImageElement cache and does not recycle a player-owned gallery character', async () => {
  vi.useFakeTimers();
  const f = club();
  const preset = character('wardrobe-1');
  preset.Appearance = [{Asset:{Name:'Cardigan'}}] as Character['Appearance'];
  f.gallery.selectedCharacter = f.player;
  f.host.WardrobeCharacter![1] = preset;
  const image = {complete:false, naturalWidth:0};
  f.cache.mockReturnValue(image as HTMLImageElement);
  const pending = renderWardrobeSlot(1, signal(), f.host);
  await vi.advanceTimersByTimeAsync(60);
  image.complete = true; image.naturalWidth = 500;
  await vi.advanceTimersByTimeAsync(60);
  expect(await pending).toBeInstanceOf(HTMLCanvasElement);
  expect(f.loaded).not.toHaveBeenCalled();
  expect(f.host.CharacterDelete).not.toHaveBeenCalled();
  expect(f.host.WardrobeCharacter![1]).toBe(preset);
  expect(f.gallery.selectedCharacter).toBe(f.player);
});

it('cancels a cold frame on unmount and restores native state even if the wardrobe loader throws', async () => {
  const f = club();
  f.cache.mockReturnValue(undefined);
  const abort = new AbortController();
  const pending = renderWardrobeSlot(1, abort.signal, f.host);
  abort.abort();
  expect(await pending).toBeNull();
  f.loaded.mockImplementationOnce(() => { throw Error('Unavailable item'); });
  expect(await renderWardrobeSlot(1, signal(), f.host)).toBeNull();
  expect(f.gallery.selectedCharacter).toBe(null);
  expect(f.host.CharacterDelete).toHaveBeenCalledTimes(2);
});

it('uses the owner’s saved outfit when the Club is showing somebody else’s wardrobe', async () => {
  const f = club();
  const visitor = character('visitor');
  const foreignSlot = character('wardrobe-1');
  foreignSlot.Appearance = [{Asset:{Name:'Unrelated'}}] as Character['Appearance'];
  f.gallery.selectedCharacter = visitor;
  f.host.WardrobeCharacter![1] = foreignSlot;
  expect(await renderWardrobeSlot(1, signal(), f.host)).toBeInstanceOf(HTMLCanvasElement);
  expect(f.loaded).toHaveBeenCalledOnce();
  expect(f.gallery.selectedCharacter).toBe(visitor);
  expect(f.host.WardrobeCharacter![1]).toBe(foreignSlot);
  expect(f.host.CharacterDelete).not.toHaveBeenCalledWith(foreignSlot, false);
});

it('releases a cold slot if the image loader throws on a later tick, so it can be retried', async () => {
  vi.useFakeTimers();
  const f = club();
  f.cache.mockReturnValue(undefined);
  const pending = renderWardrobeSlot(1, signal(), f.host);
  f.cache.mockImplementationOnce(() => { throw Error('Image cache restarted'); });
  await vi.advanceTimersByTimeAsync(60);
  expect(await pending).toBeNull();
  expect(f.host.CharacterDelete).toHaveBeenCalledOnce();
  f.cache.mockReturnValue(bitmap);
  expect(await renderWardrobeSlot(1, signal(), f.host)).toBeInstanceOf(HTMLCanvasElement);
});

it('uses a detached frame for the current player and discards a result on account switch', async () => {
  const f = club();
  const activeCanvas = f.player.Canvas;
  expect(await renderCurrentLook(71, signal(), f.host)).toBeInstanceOf(HTMLCanvasElement);
  expect(f.player.Canvas).toBe(activeCanvas);
  const pending = renderCurrentLook(71, signal(), f.host);
  f.host.Player = character('other');
  expect(await pending).toBeNull();
});
