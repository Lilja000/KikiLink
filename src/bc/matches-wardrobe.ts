// The Club's wardrobe and drawing APIs are accessed only while an editor is open.
export interface WardrobeSlot { slot: number; name: string }
interface Bundle { Name: string; Group: string; [key: string]: unknown }
interface NativeItem {
  Asset: { Name: string; Group: { Name: string; IsAppearance(): boolean; IsBody(): boolean; HasExpression?(): boolean; AllowNone?: boolean } };
  Property?: Record<string, unknown>;
}
interface ClubCharacter {
  Name: string; Nickname?: string; MemberNumber: number; AssetFamily?: string; Appearance: NativeItem[];
  Wardrobe?: Array<Bundle[] | null>; WardrobeCharacterNames?: string[]; Canvas: HTMLCanvasElement;
  IsPlayer?(): boolean; MustDraw: boolean;
  HeightRatio?: number;
  CharacterID?: string;
}
interface WardrobeState {
  selectedCharacter: ClubCharacter | null;
  canvasCache?: Map<string, unknown>;
  drawGeneration?: number;
}
interface Mask { Url?: string }
type DrawPixels = HTMLImageElement | ImageBitmap;
type DrawSource = string | HTMLCanvasElement | DrawPixels;
type DrawOptions = { TextureAlphaMask?: Mask[] };
type DrawImageLayer = (source: DrawSource, x: number, y: number, options?: DrawOptions) => void;
interface DrawCallbacks {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawCanvas(source: HTMLCanvasElement, x: number, y: number, rects?: unknown[], masks?: Mask[], transforms?: unknown): void;
  drawImage: DrawImageLayer; drawImageColorize: DrawImageLayer;
  clearRectBlink(): void; drawCanvasBlink(): void; drawImageBlink(): void; drawImageColorizeBlink(): void;
}
interface ClubWardrobe {
  Player?: ClubCharacter; WardrobeSize?: number;
  Wardrobe?: WardrobeState;
  WardrobeCharacter?: Array<ClubCharacter | null>;
  WardrobeFastLoad?(c: ClubCharacter, slot: number, update: boolean, options: { Appearance: Bundle[] }): void;
  ServerBundledItemToAppearanceItem(family: string, b: Bundle): NativeItem | null;
  ServerBundledItemFromAppearanceItem(item: NativeItem): Bundle;
  InventoryAvailable(player: ClubCharacter, name: string, group: string): boolean;
  CharacterLoadSimple(id: string): ClubCharacter; CharacterRefresh(c: ClubCharacter, push: boolean, dialog: boolean): void;
  CharacterDelete(c: ClubCharacter, clearCache: boolean): void;
  DrawCharacterSegment(c: ClubCharacter, x: number, y: number, w: number, h: number): HTMLCanvasElement;
  CharacterAppearanceYOffset?(c: ClubCharacter, ratio: number, ignoreUpButton: boolean): number;
  CharacterAppearsInverted?(c: ClubCharacter): boolean;
  CommonDrawAppearanceBuild(c: ClubCharacter, callbacks: DrawCallbacks): void;
  DrawGetImage(url: string): DrawPixels | undefined;
  DrawImageCache?: { get(url: string): { isFailing?(): boolean } | undefined };
  DrawImageCanvas(source: DrawSource, ctx: CanvasRenderingContext2D, x: number, y: number, options?: DrawOptions): boolean;
  DrawCanvas(source: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, rects: unknown[], masks: Mask[], transforms?: unknown): boolean;
}
// Script-level lexical game bindings may exist without a window property.
declare const Player: ClubCharacter | undefined;
declare const Wardrobe: WardrobeState | undefined;
declare const WardrobeCharacter: Array<ClubCharacter | null> | undefined;
declare const WardrobeSize: number | undefined;
const native = Object.create(globalThis, {
  Player: { get: () => typeof Player === 'undefined' ? undefined : Player },
  Wardrobe: { get: () => typeof Wardrobe === 'undefined' ? undefined : Wardrobe },
  WardrobeCharacter: { get: () => typeof WardrobeCharacter === 'undefined' ? undefined : WardrobeCharacter },
  WardrobeSize: { get: () => typeof WardrobeSize === 'undefined' ? undefined : WardrobeSize },
}) as ClubWardrobe;

// The Club stores occupied presets as arrays of item bundles. Reading the slots does
// not require opening the Wardrobe screen or initializing its editing state.
export function readClubWardrobe(host: ClubWardrobe = native): WardrobeSlot[] {
  const player = host?.Player;
  const wardrobe = player?.Wardrobe;
  if (!Array.isArray(wardrobe)) return [];
  const count = typeof host.WardrobeSize === "number" && Number.isInteger(host.WardrobeSize) && host.WardrobeSize >= 0
    ? Math.min(host.WardrobeSize, wardrobe.length) : wardrobe.length;
  const slots: WardrobeSlot[] = [];
  for (let slot = 0; slot < count; slot++) {
    const bundles = wardrobe[slot];
    if (!Array.isArray(bundles) || !bundles.length) continue;
    const storedName = player?.WardrobeCharacterNames?.[slot];
    slots.push({ slot, name: (typeof storedName === 'string' && storedName.trim()) || 'Outfit ' + (slot + 1) });
  }
  return slots;
}

function matchesWardrobeAppearance(host: ClubWardrobe, player: ClubCharacter, bundles: Bundle[]) {
  const family = player.AssetFamily || 'Female3DCG';
  const fromBundle = (bundle: Bundle) => host.ServerBundledItemToAppearanceItem(family, JSON.parse(JSON.stringify(bundle)));
  const groups = new Map<string, NativeItem>();
  for (const bundle of bundles) {
    if (!bundle || typeof bundle.Name !== 'string' || typeof bundle.Group !== 'string' || groups.has(bundle.Group)) continue;
    const item = fromBundle(bundle);
    const group = item?.Asset?.Group;
    if (item && group?.IsAppearance() && host.InventoryAvailable(player, item.Asset.Name, group.Name)) groups.set(group.Name, item);
  }
  // Don't offer a body-only snapshot in place of a completely unreadable preset.
  if (!groups.size) return [];
  const clothesOnly = !Array.from(groups.values()).some(item => item.Asset.Group.IsBody());
  for (const current of player.Appearance) {
    const group = current.Asset.Group;
    if (!group.IsBody()) continue;
    if (!groups.has(group.Name) && (clothesOnly || group.AllowNone === false)) {
      const item = fromBundle(host.ServerBundledItemFromAppearanceItem(current));
      if (item) groups.set(group.Name, item);
    }
    const item = groups.get(group.Name);
    if (item && group.HasExpression?.() && current.Property?.Expression) {
      item.Property ??= {};
      item.Property.Expression = current.Property.Expression;
    }
  }
  return Array.from(groups.values());
}

// Native WebGL and 2D maintain separate image caches. Preload every visible
// layer and mask for this particular outfit before compositing its still frame.
async function matchesDrawWardrobeFrame(host: ClubWardrobe, dummy: ClubCharacter, signal: AbortSignal) {
  if (typeof host.CommonDrawAppearanceBuild !== 'function' || typeof host.DrawGetImage !== 'function'
      || typeof host.DrawImageCanvas !== 'function' || typeof host.DrawCanvas !== 'function') return true;
  const sources = new Set<string | DrawPixels>();
  const ignore = () => {};
  function addSource(source: DrawSource) {
    if (typeof source === 'string' || !('getContext' in source)) sources.add(source);
  }
  function addMasks(masks?: Mask[]) {
    for (const mask of masks || []) if (mask.Url) addSource(mask.Url);
  }
  const collect: DrawImageLayer = (source, _x, _y, opts) => {
    addSource(source);
    addMasks(opts?.TextureAlphaMask);
  };
  const skipBlink = { clearRectBlink: ignore, drawCanvasBlink: ignore, drawImageBlink: ignore, drawImageColorizeBlink: ignore };
  host.CommonDrawAppearanceBuild(dummy, {
    ...skipBlink, clearRect: ignore, drawImage: collect, drawImageColorize: collect,
    drawCanvas: (image, _x, _y, _rects, masks) => { addSource(image); addMasks(masks); }
  });

  if (sources.size) {
    const ready = await new Promise<boolean>(resolve => {
      const deadline = Date.now() + 20000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      function finish(value: boolean) {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        resolve(value);
      }
      function abort() { finish(false); }
      function checkLayers() {
        for (const source of sources) {
          // R134 returns an ImageBitmap or undefined. R132 returns an image
          // element while it loads. Re-read by URL on each attempt.
          const pixels = typeof source === 'string' ? host.DrawGetImage(source) : source;
          if (pixels && ('complete' in pixels ? pixels.complete && pixels.naturalWidth > 0 : pixels.width > 0 && pixels.height > 0)) {
            sources.delete(source);
          } else if ((pixels && 'errorcount' in pixels && Number(pixels.errorcount) >= 3) ||
                     (!pixels && typeof source === 'string' && host.DrawImageCache?.get(source)?.isFailing?.())) {
            return false;
          }
        }
        return true;
      }
      function check() {
        if (signal.aborted || Date.now() >= deadline) return finish(false);
        try {
          if (!checkLayers()) return finish(false);
          if (!sources.size) return finish(true);
          timer = setTimeout(check, 60);
        } catch {
          // A drawing hook can unload between timer ticks. Release the job so
          // subsequent outfits and an explicit retry can still run.
          finish(false);
        }
      }
      signal.addEventListener('abort', abort, { once: true });
      check();
    });
    if (!ready) return false;
  }
  if (signal.aborted) return false;
  const canvas = document.createElement('canvas');
  canvas.width = dummy.Canvas.width;
  canvas.height = dummy.Canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  let complete = true;
  const drawImage: DrawImageLayer = (source, x, y, opts) => {
    if (host.DrawImageCanvas(source, ctx, x, y, opts) === false) complete = false;
  };
  host.CommonDrawAppearanceBuild(dummy, {
    ...skipBlink, drawImage, drawImageColorize: drawImage,
    clearRect: (x, y, width, height) => ctx.clearRect(x, y, width, height),
    drawCanvas: (image, x, y, rects, masks, transforms) => {
      if (host.DrawCanvas(image, ctx, x, y, rects ?? [], masks ?? [], transforms) === false) complete = false;
    }
  });
  if (!complete) return false;
  dummy.Canvas = canvas;
  dummy.MustDraw = false;
  return true;
}

export async function renderWardrobeSlot(slot: number, signal: AbortSignal, host: ClubWardrobe = native): Promise<HTMLCanvasElement | null> {
  let dummy: ClubCharacter | undefined;
  try {
    if (signal.aborted || !Number.isInteger(slot) || slot < 0 ||
        (typeof host.WardrobeSize === 'number' && slot >= host.WardrobeSize)) return null;
    const player = host.Player;
    if (!player) return null;
    const member = player.MemberNumber;
    const source = player.Wardrobe?.[slot];
    if (!Array.isArray(source) || !source.length || !Array.isArray(player.Appearance) || typeof host.CharacterDelete !== 'function') return null;
    const snapshotText = JSON.stringify(source);
    const current = () => !signal.aborted && host.Player === player && player.MemberNumber === member && JSON.stringify(player.Wardrobe?.[slot]) === snapshotText;
    const gallery = host.Wardrobe?.selectedCharacter === player && host.WardrobeCharacter?.[slot];
    if (gallery && gallery.CharacterID === 'wardrobe-' + slot && !gallery.IsPlayer?.() && gallery.Appearance.length) {
      return await snapshot(gallery);
    }
    const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const character = host.CharacterLoadSimple('wardrobe-kikilink-' + uuid);
    if (!character || character === player || character.IsPlayer?.()) return null;
    dummy = character;
    if (host.WardrobeFastLoad && host.Wardrobe) {
      const state = host.Wardrobe;
      const selected = state.selectedCharacter;
      const cache = state.canvasCache;
      const generation = state.drawGeneration;
      // Native WardrobeFastLoad exits when the screen is closed and clears the
      // gallery cache on success. Scope both to this synchronous native call.
      try {
        state.selectedCharacter = player;
        if (cache) state.canvasCache = new Map();
        host.WardrobeFastLoad(dummy, slot, false, { Appearance: JSON.parse(snapshotText) as Bundle[] });
      } finally {
        state.selectedCharacter = selected;
        if (cache) state.canvasCache = cache;
        if (generation !== undefined) state.drawGeneration = generation;
      }
    } else if (host.WardrobeFastLoad) {
      host.WardrobeFastLoad(dummy, slot, false, { Appearance: JSON.parse(snapshotText) as Bundle[] });
    } else {
      dummy.Appearance = matchesWardrobeAppearance(host, player, source);
      if (dummy.Appearance.length) host.CharacterRefresh(dummy, false, false);
    }
    return dummy.Appearance.length ? await snapshot(dummy) : null;

    async function snapshot(outfit: ClubCharacter) {
      const frame = Object.assign(Object.create(Object.getPrototypeOf(outfit)) as ClubCharacter, outfit);
      if (!await matchesDrawWardrobeFrame(host, frame, signal) || !current()) return null;
      return frameCanvas(host, frame);
    }
  } catch {
    return null;
  } finally {
    if (dummy) host.CharacterDelete(dummy, false);
  }
}

function frameCanvas(host: ClubWardrobe, character: ClubCharacter): HTMLCanvasElement | null {
  // DrawCharacterSegment returns unscaled layers. Native room rendering
  // applies stature, pose height and inversion afterwards, before labels.
  const ratio = character.HeightRatio || 1;
  if (!Number.isFinite(ratio) || ratio < .1 || ratio > 10) return null;
  const y = host.CharacterAppearanceYOffset?.(character, ratio, true) ?? 0;
  const frame = host.DrawCharacterSegment(character, 0, -y / ratio, 500, 1000 / ratio);
  if (!frame?.width || !frame.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 350;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (host.CharacterAppearsInverted?.(character)) {
    ctx.translate(canvas.width, canvas.height);
    ctx.scale(-1, -1);
  }
  const width = canvas.width * ratio;
  ctx.drawImage(frame, (canvas.width - width) / 2, 0, width, canvas.height);
  return canvas;
}

// Use asynchronous compression while the Club continues drawing the active room.
export function encodeMatchesImage(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise(resolve => canvas.toBlob(blob => {
    if (!blob || blob.size > 512 * 1024) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  }, 'image/webp', 0.87));
}

export async function renderCurrentLook(memberNumber: number, signal: AbortSignal, host = native): Promise<HTMLCanvasElement | null> {
  const player = host.Player;
  if (!player || player.MemberNumber !== memberNumber || signal.aborted) return null;
  try {
    if (player.MustDraw) host.DrawCharacterSegment(player, 0, 0, 1, 1);
    // Composite into a private canvas. The active character keeps its own
    // normal/blink canvases while cold layers or masks are being loaded.
    const frame = Object.assign(Object.create(Object.getPrototypeOf(player)) as ClubCharacter, player);
    if (!await matchesDrawWardrobeFrame(host, frame, signal)) return null;
    if (signal.aborted || host.Player !== player || player.MemberNumber !== memberNumber) return null;
    return frameCanvas(host, frame);
  } catch { return null; }
}
