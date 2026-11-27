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

it('uses the active native compositor and fits a wide Wardrobe backing surface with both outfit edges intact', async () => {
  const f = club();
  const blit = vi.fn();
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
    drawImage: blit,
  } as unknown as CanvasRenderingContext2D));
  const nativeSurface = canvas();
  nativeSurface.width = 1000;
  nativeSurface.height = 1850;
  f.host.CanvasUpperOverflow = 700;
  f.host.CharacterAppearanceBuildCanvas = vi.fn(c => {
    expect(c).toBe(vi.mocked(f.host.CharacterLoadSimple).mock.results[0]?.value);
    c.Canvas = nativeSurface;
  });
  const portrait = await renderWardrobeSlot(1, signal(), f.host);
  expect(portrait).toBeInstanceOf(HTMLCanvasElement);
  expect(f.draw).not.toHaveBeenCalled();
  expect(f.host.DrawCharacterSegment).not.toHaveBeenCalled();
  // A left train at x=20 and a right wing at x=930 both fit at .35x.
  expect(blit).toHaveBeenCalledWith(nativeSurface, 0, 700, 1000, 1000, 0, 350, 350, 350);
});

it('keeps an ordinary outfit at full native height when an extended renderer adds empty horizontal gutters', async () => {
  const f = club();
  const blit = vi.fn();
  const pixels = new Uint8ClampedArray(250 * 250 * 4);
  for (let x = 100; x < 150; x++) pixels[(100 * 250 + x) * 4 + 3] = 255;
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
    drawImage: blit, getImageData: () => ({data: pixels}),
  } as unknown as CanvasRenderingContext2D));
  const nativeSurface = canvas();
  nativeSurface.width = 1000; nativeSurface.height = 1850;
  f.host.CanvasUpperOverflow = 700;
  f.host.CharacterAppearanceBuildCanvas = vi.fn(c => { c.Canvas = nativeSurface; });
  const portrait = await renderWardrobeSlot(1, signal(), f.host);
  expect(portrait).toBeInstanceOf(HTMLCanvasElement);
  expect(blit).toHaveBeenLastCalledWith(nativeSurface, 250, 700, 500, 1000, 0, 0, 350, 700);
});

it('waits on the active WebGL texture cache before rebuilding and preserves the native origin on a 500-wide frame', async () => {
  vi.useFakeTimers();
  const f = club();
  f.host.GLVersion = 'WebGL 2';
  f.host.GLDrawCanvas = {GL:{isContextLost: () => false}};
  let ready = false;
  f.host.GLDrawImageCache = {get: () => ({isLoaded: () => ready})};
  const nativeSurface = canvas();
  nativeSurface.width = 500;
  nativeSurface.height = 1850;
  f.host.CharacterAppearanceBuildCanvas = vi.fn(c => { c.Canvas = nativeSurface; });
  const pending = renderWardrobeSlot(1, signal(), f.host);
  await vi.advanceTimersByTimeAsync(70);
  expect(f.host.CharacterAppearanceBuildCanvas).not.toHaveBeenCalled();
  ready = true;
  await vi.advanceTimersByTimeAsync(70);
  expect(await pending).toBeInstanceOf(HTMLCanvasElement);
  expect(f.cache).not.toHaveBeenCalled();
  expect(f.host.CharacterAppearanceBuildCanvas).toHaveBeenCalledOnce();
  expect(f.host.DrawCharacterSegment).toHaveBeenCalledWith(expect.objectContaining({ Canvas: nativeSurface }),0,-0,500,1000);
});

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

it('waits for the actual WebGL cache entry after a clothing mod rewrites the layer URL', async () => {
  vi.useFakeTimers();
  const f = club();
  f.host.GLVersion = 'webgl2';
  f.host.GLDrawCanvas = {GL:{isContextLost: () => false}};
  const url = 'https://clothes.example/outfit.png';
  let loaded = false;
  const image = {url, lastUsed: Date.now(), isLoaded: () => loaded, isFailing: () => false, unload: vi.fn()};
  const get = vi.fn((key: string) => {
    if (key !== url) throw Error('Unexpected unremapped texture lookup');
    image.lastUsed = Date.now();
    return image;
  });
  f.host.GLDrawImageCache = {cache: new Map([[url, image]]), get};
  const build = vi.fn((c: Character) => { c.DrawnAssets = new Set([url]); get(url); c.Canvas = canvas(); });
  f.host.CharacterAppearanceBuildCanvas = build;
  const result = renderWardrobeSlot(1, signal(), f.host);
  await vi.advanceTimersByTimeAsync(70);
  expect(build).toHaveBeenCalledOnce();
  loaded = true;
  await vi.advanceTimersByTimeAsync(70);
  expect(await result).toBeInstanceOf(HTMLCanvasElement);
  expect(build).toHaveBeenCalledTimes(2);
  expect(f.host.CommonDrawAppearanceBuild).not.toHaveBeenCalled();
  expect(f.cache).not.toHaveBeenCalled();
});

it('keeps native remaining pixels with an unavailable layer and retries a fully failed outfit only on request', async () => {
  const f = club();
  const url = 'Assets/Hair/Detail.png';
  const image = {url, lastUsed: Date.now(), isLoaded: () => false, isFailing: () => true, unload: vi.fn()};
  const get = vi.fn(() => image);
  f.host.DrawImageCache = {cache: new Map([[url, image]]), get};
  f.host.CharacterAppearanceBuildCanvas = vi.fn((c: Character) => { c.DrawnAssets = new Set([url]); c.Canvas = canvas(); });
  const sample = new Uint8ClampedArray([0, 0, 0, 255]);
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(() => ({
    drawImage: vi.fn(), getImageData: () => ({data: sample}),
  } as unknown as CanvasRenderingContext2D));
  expect(await renderWardrobeSlot(1, signal(), f.host)).toBeInstanceOf(HTMLCanvasElement);
  sample[3] = 0;
  expect(await renderWardrobeSlot(1, signal(), f.host)).toBeNull();
  expect(get).not.toHaveBeenCalled();
  get.mockImplementationOnce(() => {
    image.isLoaded = () => true; image.isFailing = () => false;
    return image;
  });
  expect(await renderWardrobeSlot(1, signal(), f.host, true)).toBeInstanceOf(HTMLCanvasElement);
  expect(get).toHaveBeenCalledExactlyOnceWith(url);
  expect(image.unload).toHaveBeenCalledOnce();
});
