// R132 wardrobe APIs are accessed only while an editor is open.
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
}
interface Mask { Url?: string }
type DrawSource = string | HTMLCanvasElement | HTMLImageElement;
type DrawOptions = { TextureAlphaMask?: Mask[] };
type DrawImageLayer = (source: DrawSource, x: number, y: number, options?: DrawOptions) => void;
interface DrawCallbacks {
  clearRect(x: number, y: number, w: number, h: number): void;
  drawCanvas(source: HTMLCanvasElement, x: number, y: number, rects?: unknown[], masks?: Mask[]): void;
  drawImage: DrawImageLayer; drawImageColorize: DrawImageLayer;
  clearRectBlink(): void; drawCanvasBlink(): void; drawImageBlink(): void; drawImageColorizeBlink(): void;
}
interface ClubWardrobe {
  Player?: ClubCharacter; WardrobeSize?: number;
  ServerBundledItemToAppearanceItem(family: string, b: Bundle): NativeItem | null;
  ServerBundledItemFromAppearanceItem(item: NativeItem): Bundle;
  InventoryAvailable(player: ClubCharacter, name: string, group: string): boolean;
  CharacterLoadSimple(id: string): ClubCharacter; CharacterRefresh(c: ClubCharacter, push: boolean, dialog: boolean): void;
  CharacterDelete(c: ClubCharacter, clearCache: boolean): void;
  DrawCharacterSegment(c: ClubCharacter, x: number, y: number, w: number, h: number): HTMLCanvasElement;
  CommonDrawAppearanceBuild(c: ClubCharacter, callbacks: DrawCallbacks): void;
  DrawGetImage(url: string): HTMLImageElement;
  DrawImageCanvas(source: DrawSource, ctx: CanvasRenderingContext2D, x: number, y: number, options?: DrawOptions): boolean;
  DrawCanvas(source: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, rects: unknown[], masks: Mask[]): boolean;
}
function clubWardrobe(): ClubWardrobe {
  return globalThis as unknown as ClubWardrobe;
}

// R132 stores occupied presets as arrays of item bundles. Reading the slots does
// not require opening the Wardrobe screen or initializing its editing state.
export function readClubWardrobe(host: ClubWardrobe = clubWardrobe()): WardrobeSlot[] {
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
  const sources = new Set<HTMLImageElement & { errorcount?: number }>();
  const ignore = () => {};
  function addSource(source: DrawSource) {
    if (typeof source === 'string') sources.add(host.DrawGetImage(source));
    else if (source && 'naturalWidth' in source) sources.add(source);
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

  const pending = [...sources].filter(image => !image.complete || !image.naturalWidth);
  if (pending.length) {
    const ready = await new Promise<boolean>(resolve => {
      const deadline = Date.now() + 20000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      function finish(value: boolean) {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        resolve(value);
      }
      function abort() { finish(false); }
      function check() {
        if (signal.aborted || Date.now() >= deadline || pending.some(image => (image.errorcount ?? 0) >= 3)) return finish(false);
        if (pending.every(image => image.complete && image.naturalWidth > 0)) return finish(true);
        timer = setTimeout(check, 60);
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
    drawCanvas: (image, x, y, rects, masks) => {
      if (host.DrawCanvas(image, ctx, x, y, rects ?? [], masks ?? []) === false) complete = false;
    }
  });
  if (!complete) return false;
  dummy.Canvas = canvas;
  dummy.MustDraw = false;
  return true;
}

export async function captureWardrobeSlot(slot: number, signal: AbortSignal, host: ClubWardrobe = clubWardrobe()): Promise<string | null> {
  let dummy: ClubCharacter | undefined;
  try {
    if (signal.aborted || !Number.isInteger(slot) || slot < 0 ||
        (typeof host.WardrobeSize === 'number' && slot >= host.WardrobeSize)) return null;
    const player = host.Player;
    if (!player) return null;
    const member = player.MemberNumber;
    const source = player.Wardrobe?.[slot];
    if (!Array.isArray(source) || !source.length || !Array.isArray(player.Appearance) || typeof host.CharacterDelete !== 'function') return null;
    const snapshot = JSON.stringify(source);
    const current = () => !signal.aborted && host.Player === player && player.MemberNumber === member && JSON.stringify(player.Wardrobe?.[slot]) === snapshot;
    const appearance = matchesWardrobeAppearance(host, player, source);
    if (!appearance.length) return null;
    const uuid = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const character = host.CharacterLoadSimple('KikiLinkMatchesPreview-' + uuid);
    if (!character || character === player || character.IsPlayer?.()) return null;
    dummy = character;
    dummy.Appearance = appearance;
    host.CharacterRefresh(dummy, false, false);
    if (!await matchesDrawWardrobeFrame(host, dummy, signal)) return null;
    if (!current()) return null;
    const frame = host.DrawCharacterSegment(dummy, 0, 0, 500, 1000);
    const image = await encodeSnapshot(frame);
    return current() ? image : null;
  } catch {
    return null;
  } finally {
    if (dummy) host.CharacterDelete(dummy, false);
  }
}

async function encodeSnapshot(frame: HTMLCanvasElement): Promise<string | null> {
  if (!frame?.width || !frame.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 350;
  canvas.height = 700;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let alpha = 3; alpha < pixels.length; alpha += 4) {
    if (pixels[alpha]) return encodeMatchesImage(canvas);
  }
  return null;
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

export async function captureCurrentLook(memberNumber: number, signal: AbortSignal, host = clubWardrobe()): Promise<string | null> {
  const player = host.Player;
  if (!player || player.MemberNumber !== memberNumber || signal.aborted) return null;
  try {
    const frame = host.DrawCharacterSegment(player, 0, 0, 500, 1000);
    const image = await encodeSnapshot(frame);
    return !signal.aborted && host.Player === player && player.MemberNumber === memberNumber ? image : null;
  } catch { return null; }
}
