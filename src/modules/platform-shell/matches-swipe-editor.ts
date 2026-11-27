import { element } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { readClubWardrobe, captureWardrobeSlot, captureCurrentLook, encodeMatchesImage, type WardrobeSlot } from '../../bc/matches-wardrobe';
import type { SwipeCard, SwipeCardDraft } from '../../cloud/matches-swipe';
import { matchesBackgroundLabel, matchesBackgroundUrl, matchesBackgrounds, randomMatchesBackground } from './matches-swipe-backgrounds';

export interface MatchesSwipeEditorOptions {
  memberNumber: number;
  card: SwipeCard | null;
  initialAvailable?: boolean;
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
  try {
    const photo = new Image();
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
  } finally { URL.revokeObjectURL(url); }
  throw new Error('This photo could not be prepared. Choose another image.');
}

// The Cloud re-encodes snapshots. Compare thumbnails at the visible tile size
// so re-encoding noise is ignored, while a newly saved outfit in the same
// named slot does not acquire the previous outfit's checkmark.
async function sameWardrobeThumbnail(a: string, b: string): Promise<boolean> {
  async function pixels(src: string) {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 44; canvas.height = 88;
    const brush = canvas.getContext('2d', {willReadFrequently: true});
    if (!brush) return null;
    brush.fillStyle = '#26222b';
    brush.fillRect(0, 0, canvas.width, canvas.height);
    brush.drawImage(image, 0, 0, canvas.width, canvas.height);
    return brush.getImageData(0, 0, canvas.width, canvas.height).data;
  }
  const [left, right] = await Promise.all([pixels(a), pixels(b)]);
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
  const backgrounds = matchesBackgrounds(card?.background);
  const slots = active() ? readClubWardrobe() : [];
  const draft: SwipeCardDraft = {
    name: card?.name ?? (active() ? (Player.Nickname?.trim() || Player.Name || '').slice(0, 40) : ''),
    available: card?.available ?? options.initialAvailable ?? true,
    background: card?.background || randomMatchesBackground(backgrounds),
    lookSource: card?.lookSource ?? 'none',
    wardrobeSlot: card?.wardrobeSlot ?? null,
    wardrobeName: card?.wardrobeName ?? null,
  };
  const previews = new Map<number, Promise<string | null>>();
  let expanded = false;
  let artworkRequest = 0;
  let loadingLook = false;
  let saving = false;
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
  const bgSelect = element('select', { className: 'bg-select' });
  for (const id of backgrounds) {
    const option = element('option', { text: matchesBackgroundLabel(id) });
    option.value = id;
    bgSelect.append(option);
  }
  const shuffle = element('button', { type: 'button', className: 'button', title: 'Random background', ariaLabel: 'Random background' }, icon('shuffle'));
  const room = element('img', { className: 'bg', alt: '' });
  const roomLabel = element('span');
  const missing = element('div', { className: 'missing-look' }, icon('profile'), element('span', { text: 'Your character' }));
  const figure = element('img', { className: 'figure', alt: 'Your card portrait' });
  figure.hidden = true;
  room.draggable = figure.draggable = false;
  const scene = element('div', { className: 'scene' }, room, missing, figure);
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
  const upload = element('button', { type: 'button', className: 'upload' }, icon('image'), 'Upload photo');
  const current = element('button', { type: 'button', className: 'upload' }, icon('profile'), 'Use current Club look');
  current.hidden = !!slots.length;
  const error = element('p', { className: 'error form-error' });
  error.hidden = true;
  error.setAttribute('role', 'alert');
  const save = element('button', { type: 'submit', className: 'button primary' },
    card ? 'Save changes' : 'Start swiping', icon(card ? 'check' : 'arrow-right'));
  const cancel = options.onCancel ? element('button', { type: 'button', className: 'button minor', text: 'Cancel', onClick: options.onCancel }) : undefined;
  const remove = card && options.onRemove ? element('button', { type: 'button', className: 'textbtn', text: 'Remove card' }) : undefined;
  const confirmation = element('div', { className: 'field' });
  confirmation.hidden = true;
  const title = element('h2', { text: card ? 'Edit your card' : 'Set up your card', tabIndex: -1 });
  const labeled = (label: string, control: HTMLElement) => element('label', { className: 'field' }, element('span', { className: 'fieldlabel', text: label }), control);
  const bgField = element('div', { className: 'field' });
  bgSelect.id = 'kl-sw-background';
  const bgLabel = element('label', { className: 'fieldlabel', text: 'Club background' });
  bgLabel.htmlFor = bgSelect.id;
  bgField.append(bgLabel, element('div', { className: 'fieldrow' }, bgSelect, shuffle));
  const form = element('form', { className: 'side' },
    element('div', {}, title, element('p', { className: 'intro', text: 'Choose a Wardrobe look or upload a photo to show on your Matches card.' })),
    labeled('Display name', name),
    element('div', { className: 'field' }, element('span', { className: 'fieldlabel', text: 'Character look' }),
      strip, hint, selected, element('div', { className: 'looktools' }, current, upload, file)),
    bgField, element('label', { className: 'switchrow' }, available, 'Share that I’m open to chat'),
    error, element('div', { className: 'savebar' }, cancel, save), remove, confirmation);
  const panel = element('section', { className: 'panel setupPanel' }, preview, form);
  host.replaceChildren(panel);

  function setError(message: string) {
    error.textContent = message;
    error.hidden = !message;
  }
  function controls() {
    save.disabled = loadingLook || saving;
    form.inert = saving;
    form.setAttribute('aria-busy', String(saving));
  }
  function showPicture(source: string) {
    figure.src = source;
    figure.hidden = false;
    missing.hidden = true;
  }
  function syncSelection() {
    const label = draft.lookSource === 'wardrobe' ? draft.wardrobeName
      : draft.lookSource === 'photo' ? 'Uploaded photo' : draft.lookSource === 'current' ? 'Current Club look' : '';
    selected.textContent = label ? 'Selected · ' + label : '';
    selected.hidden = !label;
    for (const button of picks.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(draft.lookSource === 'wardrobe' && (savedSlotMatches || !!draft.image) &&
        draft.wardrobeSlot === Number(button.dataset.slot) && draft.wardrobeName === button.title));
    }
  }
  function setBackground(id: string) {
    draft.background = bgSelect.value = id;
    room.src = matchesBackgroundUrl(id);
    roomLabel.textContent = matchesBackgroundLabel(id);
  }
  function picture(slot: number): Promise<string | null> {
    const cached = previews.get(slot);
    if (cached) return cached;
    const job = captureWardrobeSlot(slot, signal).then(image => {
      if (!image) previews.delete(slot);
      return image;
    });
    previews.set(slot, job);
    return job;
  }
  async function choose(source: 'wardrobe' | 'current' | 'photo', load: () => Promise<string | null>, slot?: WardrobeSlot) {
    if (!active() || saving) return;
    const ticket = ++artworkRequest;
    loadingLook = true;
    controls();
    setError('');
    selected.hidden = false;
    selected.textContent = 'Loading ' + (slot?.name || (source === 'photo' ? 'photo' : 'current look')) + '…';
    try {
      const image = await load();
      if (!active() || ticket !== artworkRequest) return;
      if (!image) throw new Error('This look could not be previewed. Try it again or upload a photo.');
      draft.image = image;
      draft.lookSource = source;
      draft.wardrobeSlot = slot?.slot ?? null;
      draft.wardrobeName = slot?.name ?? null;
      showPicture(image);
    } catch (e) {
      if (active() && ticket === artworkRequest) setError(e instanceof Error && e.name === 'Error' ? e.message : 'This image could not be opened. Try another image.');
    } finally {
      if (active() && ticket === artworkRequest) {
        loadingLook = false;
        controls();
        syncSelection();
      }
    }
  }
  function showSlots() {
    observer?.disconnect();
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          const button = entry.target as HTMLButtonElement;
          observer?.unobserve(button);
          renderTile(button);
        }
      }, { rootMargin: '160px' });
    }
    picks.replaceChildren();
    for (const [index, slot] of (expanded ? slots : slots.slice(0, 5)).entries()) {
      const tile = element('button', { className: 'pick', type: 'button', ariaLabel: slot.name, title: slot.name,
        onClick: () => { void choose('wardrobe', () => picture(slot.slot), slot); } },
        element('span', { className: 'outfit-image' }, icon('profile')));
      tile.dataset.slot = String(slot.slot);
      picks.append(tile);
      if (index < 5 || !observer) renderTile(tile);
      else observer.observe(tile);
    }
    more.hidden = slots.length <= 5;
    more.title = expanded ? 'Show fewer outfits' : 'Show all ' + slots.length + ' outfits';
    more.setAttribute('aria-label', more.title);
    more.setAttribute('aria-expanded', String(expanded));
    syncSelection();
  }
  function renderTile(button: HTMLButtonElement) {
    void picture(Number(button.dataset.slot)).then(image => {
      if (image && active() && picks.contains(button)) button.firstElementChild?.replaceChildren(element('img', { alt: '', src: image }));
    });
  }

  setBackground(draft.background);
  showSlots();
  more.onclick = event => {
    expanded = !expanded;
    showSlots();
    if (expanded && !event.detail) picks.querySelectorAll('button')[5]?.focus({ preventScroll: true });
  };
  shuffle.onclick = () => setBackground(randomMatchesBackground(backgrounds, draft.background));
  bgSelect.onchange = () => setBackground(bgSelect.value);
  current.onclick = () => { void choose('current', () => captureCurrentLook(memberNumber, signal)); };
  upload.onclick = () => file.click();
  file.onchange = () => {
    const picked = file.files?.[0];
    file.value = '';
    if (picked) void choose('photo', () => preparePhoto(picked, signal));
  };

  if (card?.imageVersion) {
    void options.loadImage(card).then(async image => {
      if (!image || !active() || draft.image !== undefined) return;
      savedUrl = URL.createObjectURL(image);
      showPicture(savedUrl);
      const slot = slots.find(item => item.slot === card.wardrobeSlot && item.name === card.wardrobeName);
      if (card.lookSource === 'wardrobe' && slot) {
        const saved = savedUrl;
        const thumbnail = await picture(slot.slot);
        if (thumbnail && active() && draft.image === undefined) {
          savedSlotMatches = await sameWardrobeThumbnail(saved, thumbnail).catch(() => false);
          if (active() && !loadingLook && draft.image === undefined) syncSelection();
        }
      }
    }).catch(() => {
      if (active() && draft.image === undefined) setError('Your saved picture could not be loaded. You can keep it or choose another.');
    });
  } else if (active()) {
    const first = slots[0];
    if (first) void choose('wardrobe', () => picture(first.slot), first);
    else void choose('current', () => captureCurrentLook(memberNumber, signal));
  }

  async function submit(action: () => Promise<unknown>) {
    if (saving || !active()) return;
    saving = true; controls(); setError('');
    try { await action(); }
    catch (e) {
      if (active()) setError(e instanceof Error && e.message.includes(' ') ? e.message : 'Your card could not be updated. Check your Cloud connection and try again.');
    } finally { if (active()) { saving = false; controls(); } }
  }
  form.onsubmit = event => {
    event.preventDefault();
    if (loadingLook || saving || !active()) return;
    draft.name = name.value.trim(); draft.available = available.checked;
    if (!draft.name) { setError('Enter a display name.'); name.focus(); return; }
    void submit(() => options.onSave({ ...draft }, signal));
  };
  if (remove && options.onRemove) {
    const no = element('button', { type: 'button', className: 'button minor', text: 'Keep card', onClick: () => { confirmation.hidden = true; remove.hidden = false; remove.focus(); } });
    const yes = element('button', { type: 'button', className: 'button', text: 'Remove card', onClick: () => { void submit(() => options.onRemove!(signal)); } });
    confirmation.append(element('p', { className: 'intro', text: 'Remove your card, swipes and mutual likes from Matches?' }), element('div', { className: 'actions' }, no, yes));
    remove.onclick = () => { confirmation.hidden = false; remove.hidden = true; no.focus(); };
  }
  return () => {
    controller.abort();
    observer?.disconnect();
    if (savedUrl) URL.revokeObjectURL(savedUrl);
    panel.remove();
  };
}
