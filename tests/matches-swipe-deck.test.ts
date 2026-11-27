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

function mount(vote:(target:SwipeCard,type:'pass'|'like',op:string)=>Promise<{matched:boolean}>) {
  const host = document.createElement('div');
  document.body.append(host);
  const image = vi.fn(async (_c:SwipeCard) => null);
  const deck = createMatchesSwipeDeck(host, {vote, image, current:()=>true, undo:async()=>{}, moreMutuals:async()=>({items:[],nextCursor:null}), navigate:()=>{}});
  cleanups.push(deck.dispose);
  return {host, deck, image};
}

it('keeps the live stage and preloads public portraits even though private Wardrobe metadata is omitted', () => {
  const {host,deck,image} = mount(async()=>({matched:false}));
  deck.update(snapshot(),'swipe');
  const stage = host.querySelector('.swipable');
  expect(stage).not.toBeNull();
  expect(image.mock.calls.map(([p])=>p.memberNumber)).toEqual([3,2]);
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
