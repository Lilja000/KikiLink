// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import type { SwipeCard, SwipeSnapshot } from '../src/cloud/matches-swipe';
import { createMatchesSwipeDeck } from '../src/modules/platform-shell/matches-swipe-deck';

const card = (memberNumber: number): SwipeCard => ({
  memberNumber, name:'Member '+memberNumber, background:'CosyChalet', revision:1, available:true, imageVersion:'1',
  lookSource:'none', wardrobeSlot:null, wardrobeName:null, languages:[], tags:[], bio:'',
});
const snapshot = (): SwipeSnapshot => ({
  self:card(1), deck:[card(2),card(3)], deckCursor:null, mutuals:[], mutualCursor:null,
  lastVote:null, seen:0, remaining:2, mutualCount:0,
});
const cleanups: (()=>void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.replaceChildren(); vi.useRealTimers(); });

type DeckActions = Parameters<typeof createMatchesSwipeDeck>[1];
function mount(vote:(target:SwipeCard,type:'pass'|'like',op:string)=>Promise<{matched:boolean}>, options:Partial<DeckActions> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const image = vi.fn(async (_c:SwipeCard) => null);
  const deck = createMatchesSwipeDeck(host, {vote, image, current:()=>true, undo:async()=>{}, moreMutuals:async()=>({items:[],nextCursor:null}), navigate:()=>{},...options});
  cleanups.push(deck.dispose);
  return {host, deck, image};
}

it('keeps the live stage and preloads public portraits even though private Wardrobe metadata is omitted', () => {
  const {host,deck,image} = mount(async()=>({matched:false}));
  deck.update(snapshot(),'swipe');
  const stage = host.querySelector('.swipable');
  expect(stage).not.toBeNull();
  expect(image.mock.calls.map(([p])=>p.memberNumber)).toEqual([2,3]);
  deck.update(snapshot(),'swipe');
  expect(host.querySelector('.swipable')).toBe(stage);
  expect(image).toHaveBeenCalledTimes(2);
});

it('retries an unconfirmed swipe with the original operation id, and ignores repeated input while pending', async () => {
  vi.useFakeTimers();
  const calls:string[] = [];
  const {host,deck} = mount(async (_target,_type,id) => {
    calls.push(id);
    if (calls.length === 1) throw new Error('lost connection');
    return {matched:false};
  });
  deck.update(snapshot(),'swipe');
  const pass = () => host.querySelector<HTMLButtonElement>('[data-action="pass"]')!.click();
  pass(); await vi.advanceTimersByTimeAsync(250);
  expect(host.querySelector<HTMLElement>('[role="alert"]')?.hidden).toBe(false);
  pass(); pass();
  await vi.advanceTimersByTimeAsync(250);
  expect(calls).toHaveLength(2);
  expect(calls[0]).toBe(calls[1]);
  expect(host.querySelector('.name')?.textContent).toBe('Member 3');
});

it('shows only shared availability and omits missing profile sections in the deck and mutual profile', () => {
  const {host,deck} = mount(async()=>({matched:false}));
  const s = snapshot();
  const first = s.deck[0]!;
  deck.update(s,'swipe');
  expect(host.querySelector('.meta')?.textContent).toBe('Open to chat');
  expect(host.querySelector('.card-story')).toBeNull();
  first.languages = ['English', 'Finnish'];
  deck.update(s,'swipe');
  expect(host.querySelector('.meta')?.textContent).toBe('English · Finnish · Open to chat');
  s.mutuals = [first]; s.mutualCount = 1;
  deck.update(s,'mutual');
  host.querySelector<HTMLButtonElement>('.tile')!.click();
  expect(host.querySelector('dialog .meta')?.textContent).toBe('English · Finnish · Open to chat');
  host.querySelector('dialog')!.close();
  first.available = false;
  first.languages = [];
  deck.update(s,'swipe');
  expect(host.querySelector('.meta')).toBeNull();
  expect(host.querySelector('.swipePanel')?.textContent).not.toMatch(/Open to chat|not shared/i);
});

it('closes a mutual card with Escape without activating panel shortcuts, and returns focus to the same player', async () => {
  const {host, deck} = mount(async()=>({matched:false}));
  const shellKey = vi.fn();
  host.addEventListener('keydown', shellKey);
  const s = snapshot();
  s.mutuals = [card(2)]; s.mutualCount = 1;
  deck.update(s,'mutual');
  const tile = host.querySelector<HTMLButtonElement>('.tile')!;
  const dialog = host.querySelector('dialog')!;
  tile.click();
  const done = dialog.querySelector<HTMLButtonElement>('.primary')!;
  done.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));
  expect(dialog.open).toBe(true);
  const esc = new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
  done.dispatchEvent(esc);
  expect(esc.defaultPrevented).toBe(true);
  expect(dialog.open).toBe(false);
  expect(shellKey).not.toHaveBeenCalled();
  await vi.waitFor(()=>expect(document.activeElement).toBe(tile));
  tile.click();
  expect(dialog.open).toBe(true);
});

it('retries missing portraits on a later successful poll without replacing a stationary card', async () => {
  vi.useFakeTimers();
  const image = vi.fn(async (_c:SwipeCard) => null);
  const {host,deck} = mount(async()=>({matched:false}), {image});
  deck.update(snapshot(),'swipe');
  const stage = host.querySelector('.scene');
  await vi.advanceTimersByTimeAsync(100);
  deck.update(snapshot(),'swipe');
  expect(image).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(5100);
  deck.update(snapshot(),'swipe');
  expect(host.querySelector('.scene')).toBe(stage);
  expect(image).toHaveBeenCalledTimes(4);
});

it('shows the next profile coherently while waiting and restores the previous profile if the vote fails', async () => {
  vi.useFakeTimers();
  let reject!: (e:Error)=>void;
  const {host,deck} = mount(()=>new Promise((_resolve,no)=>{ reject=no; }));
  deck.update(snapshot(),'swipe');
  host.querySelector<HTMLButtonElement>('[data-action="pass"]')!.click();
  await vi.advanceTimersByTimeAsync(236);
  expect(host.querySelector('.name')?.textContent).toBe('Member 3');
  expect(host.querySelector('.deck-number')?.textContent).toBe('2 / 2');
  expect(host.querySelector('.swipe-toast')?.textContent).toBe('Saving swipe…');
  expect(host.querySelector<HTMLButtonElement>('[data-action="like"]')?.disabled).toBe(true);
  reject(new Error('unavailable'));
  await vi.advanceTimersByTimeAsync(1);
  expect(host.querySelector('.name')?.textContent).toBe('Member 2');
  expect(host.querySelector('.deck-number')?.textContent).toBe('1 / 2');
  expect(host.querySelector<HTMLButtonElement>('[data-action="like"]')?.disabled).toBe(false);
});

it('uses the authoritative vote receipt when the write response is lost, and allocates a new operation after undo', async () => {
  vi.useFakeTimers();
  let state = snapshot();
  const ids: string[] = [];
  const {host,deck} = mount(async (target,type,id) => {
    ids.push(id);
    state = {...state,deck:state.deck.filter(c=>c.memberNumber !== target.memberNumber),
      lastVote:{id:String(ids.length), target:target.memberNumber,type},seen:1,remaining:1};
    deck.update(state,'swipe');
    if (ids.length === 1) throw new Error('response lost');
    return {matched:false};
  },{undo: async () => {state=snapshot(); deck.update(state,'swipe');}});
  deck.update(state,'swipe');
  host.querySelector<HTMLButtonElement>('[data-action="pass"]')!.click();
  await vi.advanceTimersByTimeAsync(240);
  expect(host.querySelector('.swipe-toast')?.textContent).toBe('Passed Member 2');
  expect(host.querySelector<HTMLElement>('[role="alert"]')?.hidden).toBe(true);
  host.querySelector<HTMLButtonElement>('[data-action="undo"]')!.click();
  await vi.advanceTimersByTimeAsync(1);
  host.querySelector<HTMLButtonElement>('[data-action="pass"]')!.click();
  await vi.advanceTimersByTimeAsync(240);
  expect(ids).toHaveLength(2);
  expect(ids[1]).not.toEqual(ids[0]);
});

it('retains a newly expanded mutual page through a late shallow refresh and removes withdrawn cards on revalidation', async () => {
  const {host,deck} = mount(async()=>({matched:false}),{moreMutuals:async()=>({items:[card(8)],nextCursor:null})});
  const first = {...snapshot(),mutuals:[card(5)],mutualCount:2,mutualCursor:5,mutualPagesLoaded:1};
  deck.update(first,'mutual');
  host.querySelector<HTMLButtonElement>('[data-action="more"]')!.click();
  await vi.waitFor(()=>expect(host.querySelectorAll('.tile').length).toBe(2));
  deck.update({...first},'mutual');
  const added = host.querySelector<HTMLButtonElement>('[data-member="8"]')!;
  added.click();
  expect(host.querySelector('dialog')?.open).toBe(true);
  deck.update({...first,mutuals:[card(5),card(12)],mutualCount:2,mutualCursor:null,mutualPagesLoaded:2},'mutual');
  expect(host.querySelector('dialog')?.open).toBe(false);
  expect(host.querySelector('[data-member="8"]')).toBeNull();
  expect(host.querySelector('[data-member="12"]')).not.toBeNull();
});

it('requires explicit preview permission for peer backgrounds and restores vanilla immediately on policy change', async () => {
  const release = vi.fn();
  const url = 'https://pictures.example.org/beach.jpg';
  let policy: 'always' | 'ask' | 'never' = 'ask';
  const loadBackground = vi.fn(async (_url:string,_signal:AbortSignal) => ({url:'blob:leased-beach',release}));
  const {host,deck} = mount(async()=>({matched:false}), {loadBackground, backgroundPolicy:()=>policy});
  const s = snapshot(); s.deck[0]!.backgroundUrl = url;
  deck.update(s,'swipe');
  const bg = host.querySelector<HTMLImageElement>('.swipe-face .bg')!;
  const show = host.querySelector<HTMLButtonElement>('.matches-show-background')!;
  expect(bg.getAttribute('src')).toBe('Backgrounds/CosyChalet.jpg');
  expect(show.hidden).toBe(false);
  expect(loadBackground).not.toHaveBeenCalled();
  show.click();
  await vi.waitFor(()=>expect(bg.getAttribute('src')).toBe('blob:leased-beach'));
  bg.dispatchEvent(new Event('load'));
  await vi.waitFor(()=>expect(host.querySelector('.where')?.textContent).toContain('Custom background'));
  expect(release).toHaveBeenCalledOnce();
  expect(bg.referrerPolicy).toBe('no-referrer');
  policy='never'; deck.refreshBackgroundPolicy();
  expect(bg.getAttribute('src')).toBe('Backgrounds/CosyChalet.jpg');
  expect(show.hidden).toBe(true);
  policy='always'; deck.refreshBackgroundPolicy();
  expect(loadBackground).toHaveBeenCalledTimes(2);
  policy='ask'; deck.refreshBackgroundPolicy();
  expect(loadBackground.mock.calls[1]![1].aborted).toBe(true);
  await vi.waitFor(()=>expect(release).toHaveBeenCalledTimes(2));
  expect(bg.getAttribute('src')).toBe('Backgrounds/CosyChalet.jpg');
  expect(show.hidden).toBe(false);
});

it('protects mutual detail previews and falls back to the assigned Club room if a custom background fails', async () => {
  const url='https://images.example.org/scene.webp';
  const loadBackground=vi.fn(async()=>{ throw new Error('expired'); });
  const {host,deck}=mount(async()=>({matched:false}),{loadBackground,backgroundPolicy:()=> 'ask'});
  const s=snapshot();
  s.mutuals=[{...card(2),backgroundUrl:url}]; s.mutualCount=1;
  deck.update(s,'mutual');
  host.querySelector<HTMLButtonElement>('.tile')!.click();
  const btn=host.querySelector<HTMLButtonElement>('dialog .matches-show-background')!;
  expect(loadBackground).not.toHaveBeenCalled();
  btn.click();
  await vi.waitFor(()=>expect(btn.textContent).toBe('Retry background'));
  expect(host.querySelector('dialog img.thumbbg')?.getAttribute('src')).toBe('Backgrounds/CosyChalet.jpg');
  expect(btn.hidden).toBe(false);
  expect(host.querySelector('dialog img.thumbbg')?.getAttribute('src')).not.toContain('https://');
});
