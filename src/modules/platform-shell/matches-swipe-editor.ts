import { element, focusedElement } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { readClubWardrobe, renderWardrobeSlot, renderCurrentLook, encodeMatchesImage, type WardrobeSlot } from '../../bc/matches-wardrobe';
import type { SwipeCard, SwipeCardDraft } from '../../cloud/matches-swipe';
import { normalizeMatchesBackgroundUrl } from '../../../cloud/shared/matches-background.mjs';
import { normalizeRoomMediaUrl } from '../../bc/adapter';
import { createClubBackgroundPicker } from '../link-chat/club-background-picker';
import { loadMatchesBackground, matchesBackgroundChoices, matchesBackgroundLabel, matchesBackgroundUrl, randomMatchesBackground, type MatchesBackgroundLoader } from './matches-swipe-backgrounds';

export interface MatchesSwipeEditorOptions {
  memberNumber: number;
  card: SwipeCard | null;
  initialAvailable?: boolean;
  customBackgrounds?: boolean;
  loadBackground?: MatchesBackgroundLoader;
  uploadBackground?: (file: File, signal: AbortSignal) => Promise<string>;
  pickBackground?: (signal: AbortSignal) => Promise<string | null>;
  loadImage: (card: SwipeCard) => Promise<Blob | null>;
  onSave: (draft: SwipeCardDraft, signal: AbortSignal) => Promise<unknown>;
  onCancel?: () => void;
  onRemove?: (signal: AbortSignal) => Promise<unknown>;
}

const icon = (name: KikiLinkIconName) => kikiIcon(name, 'ico');
const uploadTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function preparePhoto(file: File, signal: AbortSignal): Promise<string> {
  if (!uploadTypes.has(file.type) || file.size > 12 * 1024 * 1024) throw new Error('Choose a PNG, JPEG or WebP image under 12 MB.');
  const url = URL.createObjectURL(file);
  const photo = new Image();
  const cancel = () => photo.removeAttribute('src');
  signal.addEventListener('abort', cancel, {once: true});
  try {
    photo.src = url;
    await photo.decode();
    if (!photo.naturalWidth || !photo.naturalHeight) throw new Error();
    let scale = Math.min(1, 800 / photo.naturalWidth, 900 / photo.naturalHeight);
    const canvas = document.createElement('canvas');
    // The Cloud accepts up to 512 KiB per portrait. Keep the aspect ratio and
    // transparency, reducing the dimensions again for unusually detailed files.
    for (let attempt = 0; attempt < 4 && !signal.aborted; attempt++) {
      canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
      const brush = canvas.getContext('2d');
      if (!brush) break;
      brush.drawImage(photo, 0, 0, canvas.width, canvas.height);
      const result = await encodeMatchesImage(canvas);
      if (result) return result;
      scale *= .74;
    }
  } finally { signal.removeEventListener('abort', cancel); URL.revokeObjectURL(url); }
  throw new Error('This photo could not be prepared. Choose another image.');
}

// The Cloud re-encodes snapshots. Compare thumbnails at the visible tile size
// so re-encoding noise is ignored, while a newly saved outfit in the same
// named slot does not inherit the previous outfit's selected border.
async function sameWardrobeThumbnail(saved: string, portrait: HTMLCanvasElement): Promise<boolean> {
  function pixels(source: CanvasImageSource) {
    const canvas = document.createElement('canvas');
    canvas.width = 44; canvas.height = 88;
    const brush = canvas.getContext('2d', {willReadFrequently: true});
    if (!brush) return null;
    brush.fillStyle = '#26222b';
    brush.fillRect(0, 0, canvas.width, canvas.height);
    brush.drawImage(source, 0, 0, canvas.width, canvas.height);
    return brush.getImageData(0, 0, canvas.width, canvas.height).data;
  }
  const image = new Image();
  image.src = saved;
  await image.decode();
  const left = pixels(image), right = pixels(portrait);
  if (!left || !right) return false;
  let differences = 0;
  for (let i = 0; i < left.length; i += 4) {
    const gap = Math.max(Math.abs(left[i]! - right[i]!), Math.abs(left[i + 1]! - right[i + 1]!), Math.abs(left[i + 2]! - right[i + 2]!));
    if (gap > 20 && ++differences > 4) return false;
  }
  return true;
}

export function mountMatchesSwipeEditor(host: HTMLElement, options: MatchesSwipeEditorOptions): () => void {
  const { card, memberNumber } = options;
  const controller = new AbortController();
  const signal = controller.signal;
  const active = () => !signal.aborted && typeof Player !== 'undefined' && Player?.MemberNumber === memberNumber;
  const backgroundChoices = matchesBackgroundChoices(card?.background);
  const backgrounds = backgroundChoices.map(item => item.name);
  const slots = active() ? readClubWardrobe() : [];
  const draft: SwipeCardDraft = {
    name: card?.name ?? (active() ? (Player.Nickname?.trim() || Player.Name || '').slice(0, 40) : ''),
    available: card?.available ?? options.initialAvailable ?? true,
    background: card?.background || randomMatchesBackground(backgrounds),
    lookSource: card?.lookSource ?? 'none',
    wardrobeSlot: card?.wardrobeSlot ?? null,
    wardrobeName: card?.wardrobeName ?? null,
  };
  const rendering = new Map<number, Promise<HTMLCanvasElement | null>>();
  const thumbnails = new Map<number, HTMLCanvasElement>();
  let nativeFrame: HTMLCanvasElement | null = null;
  let failedChoice: WardrobeSlot | undefined;
  let priorityRender: Promise<HTMLCanvasElement | null> | undefined;
  const tileQueue = new Set<HTMLButtonElement>();
  let tileWorkers = 0;
  let expanded = false;
  let artworkRequest = 0;
  let loadingLook = false;
  let saving = false;
  let currentLookCapturedForSave = false;
  let savedUrl: string | undefined;
  let savedSlotMatches = false;
  let observer: IntersectionObserver | undefined;

  const name = element('input', { className: 'input' });
  name.required = true;
  name.maxLength = 40;
  name.value = draft.name;
  name.autocomplete = 'off';
  const available = element('input');
  available.type = 'checkbox';
  available.checked = draft.available;
  const picker = createClubBackgroundPicker(backgroundChoices, draft.background, setNativeBackground);
  const backgroundLink = element('input', { className: 'kl-input', ariaLabel: 'Background image' });
  backgroundLink.type = 'url';
  backgroundLink.maxLength = 250;
  backgroundLink.placeholder = 'https://…/background.webp';
  backgroundLink.value = options.customBackgrounds ? card?.backgroundUrl || '' : '';
  let backgroundPreview: AbortController | undefined;
  let backgroundOperation: AbortController | undefined;
  let previewedUrl: string | undefined;
  const retryBackground = element('button', { type: 'button', className: 'kl-text-button', text: 'Retry preview',
    onClick: () => updateBackgroundPreview() });
  retryBackground.hidden = true;
  const backgroundStatus = element('p', { className: 'kl-room-media-note' });
  backgroundStatus.setAttribute('role', 'status');
  backgroundStatus.hidden = true;
  const shuffle = element('button', { type: 'button', className: 'button', title: 'Random background', ariaLabel: 'Random background' }, icon('shuffle'));
  const room = element('img', { className: 'bg', alt: '' });
  const roomLabel = element('span');
  let figure: HTMLImageElement | HTMLCanvasElement = element('img', { className: 'figure', alt: '' });
  figure.hidden = true;
  room.draggable = figure.draggable = false;
  const scene = element('div', { className: 'scene' }, room, figure);
  const preview = element('div', { className: 'portraitBox card-preview' }, scene, element('div', { className: 'where' }, icon('location'), roomLabel));
  const picks = element('div', { className: 'wardrobe-picks picks', ariaLabel: 'Saved Wardrobe looks' });
  picks.id = 'kl-sw-wardrobe-picks';
  picks.setAttribute('role', 'group');
  const more = element('button', { className: 'wardrobe-toggle', type: 'button' }, icon('chevron-down'));
  more.setAttribute('aria-controls', picks.id);
  const strip = element('div', { className: 'wardrobe-strip' }, picks, more);
  strip.hidden = !slots.length;
  const hint = element('p', { className: 'wardrobe-caption', text: 'No saved outfits in your Wardrobe yet.' });
  hint.hidden = !!slots.length;
  const selected = element('p', { className: 'wardrobe-caption wardrobe-chosen' });
  selected.setAttribute('role', 'status');
  const file = element('input');
  file.type = 'file';
  file.hidden = true;
  file.accept = 'image/jpeg,image/png,image/webp';
  const retryTiles = element('button', { className: 'upload wardrobe-retry', type: 'button', text: 'Retry outfit previews' });
  retryTiles.hidden = true;
  retryTiles.id = 'kl-sw-wardrobe-retry';
  const upload = element('button', { type: 'button', className: 'upload' }, icon('image'), 'Upload photo');
  const current = element('button', { type: 'button', className: 'upload' }, 'Use current Club look');
  current.hidden = !!slots.length;
  const error = element('p', { className: 'error form-error' });
  error.hidden = true;
  error.setAttribute('role', 'alert');
  const retryPicture = element('button', { type: 'button', className: 'upload', text: 'Retry saved picture' });
  retryPicture.hidden = true;
  const save = element('button', { type: 'submit', className: 'button primary' },
    card ? 'Save changes' : 'Start swiping', icon(card ? 'check' : 'arrow-right'));
  const cancel = options.onCancel ? element('button', { type: 'button', className: 'button minor', text: 'Cancel', onClick: options.onCancel }) : undefined;
  const remove = card && options.onRemove ? element('button', { type: 'button', className: 'textbtn', text: 'Remove card' }) : undefined;
  const confirmation = element('div', { className: 'field' });
  confirmation.hidden = true;
  const title = element('h2', { text: card ? 'Edit your card' : 'Set up your card', tabIndex: -1 });
  const labeled = (label: string, control: HTMLElement) => element('label', { className: 'field' }, element('span', { className: 'fieldlabel', text: label }), control);
  const backgroundSummary = element('summary', { text: 'Background' });
  const bgField = element('details', { className: 'kl-room-settings-disclosure matches-background-picker' },
    backgroundSummary, picker.element,
    element('div', { className: 'kl-inline-actions' }, shuffle));
  bgField.open = true;
  bgField.addEventListener('toggle', syncBackgroundSummary);
  if (options.customBackgrounds) {
    const actions = element('div', { className: 'kl-inline-actions' });
    if (options.pickBackground) actions.append(element('button', { type: 'button', className: 'kl-text-button',
      text: 'Choose from gallery', onClick: () => { void selectCustomMedia('gallery'); } }));
    if (options.uploadBackground) {
      const input = element('input', { ariaLabel: 'Upload background image' });
      input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.hidden = true;
      input.onchange = () => {
        const picked = input.files?.[0]; input.value = '';
        if (picked) void selectCustomMedia('file', picked);
      };
      actions.append(element('button', { type: 'button', className: 'kl-text-button', text: 'Upload image', onClick: () => input.click() }), input);
    }
    actions.append(retryBackground);
    bgField.append(element('label', { className: 'kl-room-field' }, element('span', { text: 'Background image' }), backgroundLink), actions);
    if (options.uploadBackground) bgField.append(element('p', { className: 'kl-room-media-note', text: 'Uploads use the lifetime in Chat settings.' }));
    bgField.append(backgroundStatus);
  }
  const form = element('form', { className: 'side' },
    element('div', {}, title, element('p', { className: 'intro', text: 'Choose a saved Wardrobe look or upload your own photo.' })),
    labeled('Display name', name),
    element('div', { className: 'field' }, element('span', { className: 'fieldlabel', text: 'Character look' }),
      strip, hint, selected, element('div', { className: 'looktools' }, current, upload, retryTiles, file)),
    bgField, element('label', { className: 'switchrow' }, available, 'Share that I’m open to chat'),
    error, retryPicture, element('div', { className: 'savebar' }, cancel, save), remove, confirmation);
  const panel = element('section', { className: 'panel setupPanel' }, preview, form);
  host.replaceChildren(panel);
  if (card) title.focus({preventScroll: true});

  function setError(message: string) {
    error.textContent = message;
    error.hidden = !message;
  }
  function controls() {
    save.disabled = loadingLook || !!backgroundOperation || saving;
    form.inert = saving;
    form.setAttribute('aria-busy', String(saving));
  }
  function showPicture(source: string | HTMLImageElement | HTMLCanvasElement) {
    const portrait = typeof source === 'string' ? element('img', { src: source, alt: 'Your card portrait' }) : source;
    portrait.className = 'figure';
    portrait.draggable = false;
    if (portrait instanceof HTMLCanvasElement) {
      portrait.setAttribute('role', 'img');
      portrait.setAttribute('aria-label', 'Your card portrait');
    }
    if (portrait !== figure) figure.replaceWith(portrait);
    figure = portrait;
  }
  function syncSelection() {
    if (!loadingLook) {
      selected.hidden = true;
      selected.textContent = '';
    }
    for (const button of picks.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(draft.lookSource === 'wardrobe' && (savedSlotMatches || !!nativeFrame) &&
        draft.wardrobeSlot === Number(button.dataset.slot) && draft.wardrobeName === button.getAttribute('aria-label')));
    }
  }
  function showBackgroundStatus(message: string) {
    backgroundStatus.textContent = message;
    backgroundStatus.hidden = !message;
  }
  function cancelBackgroundOperation() {
    backgroundOperation?.abort();
    backgroundOperation = undefined;
    controls();
  }
  function syncBackgroundSummary() {
    const name = previewedUrl ? 'Custom background' : matchesBackgroundLabel(draft.background);
    backgroundSummary.textContent = bgField.open ? 'Background' : 'Background · ' + name;
  }
  function updateBackgroundPreview() {
    backgroundPreview?.abort();
    backgroundPreview = undefined;
    const value = normalizeMatchesBackgroundUrl(draft.backgroundUrl === undefined ? card?.backgroundUrl : draft.backgroundUrl);
    const custom = options.customBackgrounds && value ? value : undefined;
    previewedUrl = custom;
    syncBackgroundSummary();
    retryBackground.hidden = true;
    const vanilla = matchesBackgroundLabel(draft.background);
    room.referrerPolicy = 'no-referrer';
    room.src = matchesBackgroundUrl(draft.background);
    roomLabel.textContent = vanilla;
    picker.setValue(custom ? '' : draft.background);
    showBackgroundStatus('');
    if (!custom || !options.loadBackground) return;
    const pending = new AbortController();
    backgroundPreview = pending;
    void loadMatchesBackground(room, draft.background, custom, options.loadBackground, pending.signal).then(loaded => {
      if (!active() || pending.signal.aborted) return;
      if (loaded) roomLabel.textContent = 'Custom background';
      else {
        retryBackground.hidden = false;
        showBackgroundStatus('This image could not be previewed. Saving keeps the link and uses the Club background if the image cannot load.');
      }
    });
  }
  function setNativeBackground(id: string) {
    cancelBackgroundOperation();
    draft.background = id;
    if (options.customBackgrounds) draft.backgroundUrl = null;
    backgroundLink.value = '';
    backgroundLink.setCustomValidity('');
    updateBackgroundPreview();
  }
  function applyCustomLink(): boolean {
    if (!options.customBackgrounds) return true;
    try {
      const entered = normalizeRoomMediaUrl(backgroundLink.value, 'image');
      const value = entered ? normalizeMatchesBackgroundUrl(backgroundLink.value) : null;
      if (entered && !value) throw new Error('Enter a public HTTPS link to a JPG, PNG or WebP image.');
      backgroundLink.value = value || '';
      backgroundLink.setCustomValidity('');
      if (previewedUrl !== (value || undefined)) {
        draft.backgroundUrl = value;
        updateBackgroundPreview();
      }
      return true;
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Enter a valid background image link.';
      backgroundLink.setCustomValidity(message);
      showBackgroundStatus(message);
      return false;
    }
  }
  async function selectCustomMedia(source: 'file' | 'gallery', file?: File) {
    if (!active() || saving || !options.customBackgrounds) return;
    cancelBackgroundOperation();
    const pending = new AbortController();
    backgroundOperation = pending;
    controls();
    showBackgroundStatus(source === 'file' ? 'Uploading background…' : '');
    try {
      const link = source === 'file' && file ? await options.uploadBackground?.(file, pending.signal)
        : await options.pickBackground?.(pending.signal);
      if (!active() || pending.signal.aborted) return;
      if (!link) { showBackgroundStatus(''); return; }
      backgroundLink.value = link;
      applyCustomLink();
    } catch (failure) {
      if (active() && !pending.signal.aborted) showBackgroundStatus(failure instanceof Error ? failure.message : 'The background could not be selected.');
    } finally {
      if (active() && backgroundOperation === pending) { backgroundOperation = undefined; controls(); }
    }
  }
  // Coalesce an explicit choice with a thumbnail still being drawn. Settled
  // presets keep only a small display canvas; the chosen full-size one is
  // retained separately until the user saves or changes their selection.
  function picture(slot: number): Promise<HTMLCanvasElement | null> {
    const pending = rendering.get(slot);
    if (pending) return pending;
    const job = renderWardrobeSlot(slot, signal).then(frame => {
      if (frame && active()) cacheTile(slot, frame);
      return frame;
    }).catch(() => null).finally(() => rendering.delete(slot));
    rendering.set(slot, job);
    return job;
  }
  function chosenPicture(slot: number): Promise<HTMLCanvasElement | null> {
    const pending = rendering.get(slot);
    if (pending) return pending;
    const ticket = artworkRequest;
    const start = () => {
      if (!active() || ticket !== artworkRequest) return null;
      const job = picture(slot);
      priorityRender = job;
      void job.then(() => { if (priorityRender === job) priorityRender = undefined; });
      return job;
    };
    return priorityRender ? priorityRender.then(start) : Promise.resolve(start());
  }
  async function choose(source: 'wardrobe' | 'current' | 'photo', load: () => Promise<HTMLCanvasElement | string | null>, slot?: WardrobeSlot) {
    if (!active() || saving) return;
    const ticket = ++artworkRequest;
    failedChoice = undefined;
    loadingLook = true;
    controls();
    setError('');
    selected.hidden = false;
    selected.textContent = 'Loading ' + (slot?.name || (source === 'photo' ? 'photo' : 'current look')) + '…';
    try {
      const image = await load();
      if (!active() || ticket !== artworkRequest) return;
      if (!image) {
        const previous = nativeFrame || draft.image || card?.imageVersion ? ' Your previous picture is still selected.' : '';
        throw new Error('This look could not be previewed.' + previous + ' Try again or upload a photo.');
      }
      nativeFrame = typeof image === 'string' ? null : image;
      if (typeof image === 'string') draft.image = image;
      else delete draft.image;
      draft.lookSource = source;
      draft.wardrobeSlot = slot?.slot ?? null;
      draft.wardrobeName = slot?.name ?? null;
      currentLookCapturedForSave = false;
      retryPicture.hidden = true;
      setError('');
      showPicture(image);
    } catch (e) {
      if (active() && ticket === artworkRequest) {
        failedChoice = slot;
        if (slot) {
          const button = tileAt(slot.slot);
          if (button && !thumbnails.has(slot.slot)) failedTile(button);
        }
        setError(e instanceof Error && e.name === 'Error' ? e.message : 'This image could not be opened. Try another image.');
      }
    } finally {
      if (active() && ticket === artworkRequest) {
        loadingLook = false;
        controls();
        syncSelection();
      }
    }
  }
  function tileAt(slot: number) { return picks.querySelector<HTMLButtonElement>(`[data-slot="${slot}"]`); }
  function showSlots() {
    const count = expanded ? slots.length : Math.min(5, slots.length);
    while (picks.children.length > count) {
      const button = picks.lastElementChild as HTMLButtonElement;
      observer?.unobserve(button);
      tileQueue.delete(button);
      button.remove();
    }
    for (let i = picks.children.length; i < count; i++) {
      const slot = slots[i]!;
      const tile = element('button', { className: 'pick', type: 'button', ariaLabel: slot.name,
        onClick: () => { void choose('wardrobe', () => chosenPicture(slot.slot), slot); } },
        element('span', { className: 'outfit-image' }));
      tile.dataset.slot = String(slot.slot);
      picks.append(tile);
      const thumb = thumbnails.get(slot.slot);
      if (thumb) paintTile(tile, thumb);
      else if (i < 10 || !observer) renderTile(tile);
      else {
        observer.observe(tile);
        tile.onfocus = () => { if (!tile.dataset.preview) renderTile(tile); };
      }
    }
    more.hidden = slots.length <= 5;
    more.title = expanded ? 'Show fewer outfits' : 'Show all ' + slots.length + ' outfits';
    more.setAttribute('aria-label', more.title);
    more.setAttribute('aria-expanded', String(expanded));
    refreshRetry();
    syncSelection();
  }
  function refreshRetry() {
    retryTiles.hidden = !picks.querySelector('[data-preview="failed"]');
  }
  function failedTile(button: HTMLButtonElement) {
    button.dataset.preview = 'failed';
    button.removeAttribute('aria-busy');
    button.setAttribute('aria-describedby', retryTiles.id);
    refreshRetry();
  }
  function paintTile(button: HTMLButtonElement, thumbnail: HTMLCanvasElement) {
    const holder = button.firstElementChild!;
    if (holder.firstElementChild !== thumbnail) holder.replaceChildren(thumbnail);
    button.dataset.preview = 'ready';
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-describedby');
    refreshRetry();
  }
  function compareSaved(slot: number, thumbnail: HTMLCanvasElement) {
    if (!savedUrl || draft.image !== undefined || nativeFrame || card?.lookSource !== 'wardrobe' ||
        slot !== card.wardrobeSlot || slots.find(item => item.slot === slot)?.name !== card.wardrobeName) return;
    const original = savedUrl;
    void sameWardrobeThumbnail(original, thumbnail).catch(() => false).then(matches => {
      if (!active() || nativeFrame || draft.image !== undefined || savedUrl !== original || thumbnails.get(slot) !== thumbnail) return;
      savedSlotMatches = matches;
      if (!loadingLook) syncSelection();
    });
  }
  function cacheTile(slot: number, frame: HTMLCanvasElement) {
    const thumb = element('canvas');
    thumb.width = Math.min(128, frame.width);
    thumb.height = Math.max(1, Math.round(frame.height * thumb.width / frame.width));
    const brush = thumb.getContext('2d');
    const button = tileAt(slot);
    if (!brush) { if (button) failedTile(button); return; }
    brush.drawImage(frame, 0, 0, thumb.width, thumb.height);
    thumb.setAttribute('aria-hidden', 'true');
    thumbnails.set(slot, thumb);
    if (button) paintTile(button, thumb);
    compareSaved(slot, thumb);
  }
  function renderTile(button: HTMLButtonElement) {
    if (button.dataset.preview === 'loading' || button.dataset.preview === 'ready') return;
    observer?.unobserve(button);
    button.dataset.preview = 'loading';
    button.setAttribute('aria-busy', 'true');
    button.removeAttribute('aria-describedby');
    tileQueue.add(button);
    if (tileWorkers < 2) void drawQueuedTiles();
  }
  // Each cold BC preview allocates several native full-resolution canvases.
  // Bound background rendering even if the player expands every Wardrobe row.
  // One extra render prioritizes taps; a burst of taps keeps only the last pending choice.
  async function drawQueuedTiles() {
    tileWorkers++;
    try {
      for (const button of tileQueue) {
        tileQueue.delete(button);
        if (!active()) break;
        if (!picks.contains(button)) continue;
        const slot = Number(button.dataset.slot);
        if (thumbnails.has(slot)) continue;
        const frame = await picture(slot);
        if (!frame && active() && picks.contains(button) && !thumbnails.has(slot)) failedTile(button);
      }
    } finally { tileWorkers--; }
  }

  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && picks.contains(entry.target)) renderTile(entry.target as HTMLButtonElement);
    }, { rootMargin: '160px' });
  }
  retryTiles.onclick = () => {
    const wanted = failedChoice;
    for (const button of picks.querySelectorAll<HTMLButtonElement>('[data-preview="failed"]')) renderTile(button);
    refreshRetry();
    if (wanted) void choose('wardrobe', () => chosenPicture(wanted.slot), wanted);
  };

  updateBackgroundPreview();
  backgroundLink.oninput = () => { cancelBackgroundOperation(); retryBackground.hidden = true; backgroundLink.setCustomValidity(''); showBackgroundStatus(''); };
  backgroundLink.onchange = () => { applyCustomLink(); };
  backgroundLink.onkeydown = event => {
    if (event.key === 'Enter') { event.preventDefault(); applyCustomLink(); }
  };
  showSlots();
  more.onclick = event => {
    expanded = !expanded;
    showSlots();
    if (expanded && !event.detail) picks.querySelectorAll('button')[5]?.focus({ preventScroll: true });
  };
  shuffle.onclick = () => setNativeBackground(randomMatchesBackground(backgrounds, draft.background));
  current.onclick = () => { void choose('current', () => renderCurrentLook(memberNumber, signal)); };
  upload.onclick = () => file.click();
  file.onchange = () => {
    const picked = file.files?.[0];
    file.value = '';
    if (picked) void choose('photo', () => preparePhoto(picked, signal));
  };

  async function restorePicture() {
    if (!card?.imageVersion || !active() || nativeFrame || draft.image !== undefined) return;
    retryPicture.hidden = true;
    const previousRequest = artworkRequest;
    let url: string | undefined;
    setError('');
    try {
      const image = await options.loadImage(card);
      if (!active() || nativeFrame || draft.image !== undefined) return;
      if (!image) throw new Error();
      url = URL.createObjectURL(image);
      const portrait = element('img', { src: url, alt: 'Your card portrait' });
      await portrait.decode();
      if (!active() || nativeFrame || draft.image !== undefined) return;
      if (savedUrl) URL.revokeObjectURL(savedUrl);
      savedUrl = url;
      showPicture(portrait);
      const slot = card.wardrobeSlot;
      if (slot !== null) {
        const thumb = thumbnails.get(slot);
        if (thumb) compareSaved(slot, thumb);
      }
    } catch {
      if (active() && !nativeFrame && draft.image === undefined) {
        retryPicture.hidden = false;
        if (previousRequest === artworkRequest) setError('Your saved picture could not be loaded. You can keep it or choose another.');
      }
    } finally {
      if (url && url !== savedUrl) URL.revokeObjectURL(url);
    }
  }
  retryPicture.onclick = () => { void restorePicture(); };
  if (card?.imageVersion) void restorePicture();
  else if (!card && active()) {
    const first = slots[0];
    if (first) void choose('wardrobe', () => chosenPicture(first.slot), first);
    else void choose('current', () => renderCurrentLook(memberNumber, signal));
  }

  async function submit(action: () => Promise<unknown>) {
    if (saving || !active()) return;
    const previousFocus = focusedElement(form);
    let failed = false;
    saving = true; controls(); setError('');
    try { await action(); }
    catch (e) {
      failed = true;
      if (active()) setError(e instanceof Error && e.message.includes(' ') ? e.message : 'Your card could not be updated. Check your Cloud connection and try again.');
    } finally {
      if (active()) {
        saving = false; controls();
        const now = focusedElement(form);
        if (failed && previousFocus && form.contains(previousFocus) && (!now || now === document.body)) previousFocus.focus({preventScroll: true});
      }
    }
  }
  form.onsubmit = event => {
    event.preventDefault();
    if (loadingLook || backgroundOperation || saving || !active()) return;
    if (!applyCustomLink()) { backgroundLink.focus(); return; }
    draft.name = name.value.trim(); draft.available = available.checked;
    if (!draft.name) { setError('Enter a display name.'); name.focus(); return; }
    void submit(async () => {
      if (nativeFrame && draft.image === undefined) {
        if (!card && draft.lookSource === 'current' && !currentLookCapturedForSave) {
          const frame = await renderCurrentLook(memberNumber, signal);
          if (!active()) return;
          if (!frame) throw new Error('Your current look could not be captured. Try again or upload a photo.');
          nativeFrame = frame;
          currentLookCapturedForSave = true;
          showPicture(frame);
        }
        const image = await encodeMatchesImage(nativeFrame).catch(() => null);
        if (!active()) return;
        if (!image) throw new Error('Your look could not be saved as an image. Try again or upload a photo.');
        draft.image = image;
      }
      return options.onSave({ ...draft }, signal);
    });
  };
  if (remove && options.onRemove) {
    const no = element('button', { type: 'button', className: 'button minor', text: 'Keep card', onClick: () => { confirmation.hidden = true; remove.hidden = false; remove.focus(); } });
    const yes = element('button', { type: 'button', className: 'button', text: 'Remove card', onClick: () => { void submit(() => options.onRemove!(signal)); } });
    confirmation.append(element('p', { className: 'intro', text: 'Remove your card, swipes and mutual likes from Matches?' }), element('div', { className: 'actions' }, no, yes));
    remove.onclick = () => { confirmation.hidden = false; remove.hidden = true; no.focus(); };
  }
  return () => {
    controller.abort();
    backgroundPreview?.abort();
    backgroundOperation?.abort();
    observer?.disconnect();
    tileQueue.clear();
    rendering.clear();
    thumbnails.clear();
    nativeFrame = null;
    if (savedUrl) URL.revokeObjectURL(savedUrl);
    panel.remove();
  };
}
