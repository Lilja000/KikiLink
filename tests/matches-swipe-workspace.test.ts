// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import type { CloudClient } from '../src/cloud/client';
import { MemoryKeyValueStorage } from '../src/core/settings';
import { DEFAULT_MATCH_SIGNAL } from '../cloud/shared/matching.mjs';
import { MatchesWorkspace } from '../src/modules/platform-shell/matches-workspace';

const cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.splice(0).forEach(dispose => dispose());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('preserves an open editor on reconnect and returns to Mutual likes after editing there', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Player', { MemberNumber: 1, Name: 'Kiki', Wardrobe: [] });
  const listeners = new Set<(kind: string, cause?: string) => void>();
  const card = { memberNumber: 1, revision: 1, name: 'Kiki', background: 'CosyChalet', hasImage: false,
    available: true, lookSource: 'none', languages: [], bio: '', tags: [] };
  const client = { memberNumber: 1, origin: 'https://example.test', connected: true, isProfileBlocked: () => false,
    async request(method: string, path: string, draft?: {name:string}) {
      if (path === '/v1/me') return {memberNumber:1, features:{matchingSwipe:true,matchingPeople:true}};
      if (path === '/v1/matching/me') return {owner:1, revision:1, signal:DEFAULT_MATCH_SIGNAL, active:false, canPublish:true, serverNow:Date.now()};
      if (path.startsWith('/v1/matching/people?')) return {items:[], nextCursor:null, poolLimited:false, serverNow:Date.now()};
      if (method === 'PUT' && path.endsWith('/card')) { card.revision++; card.name = draft!.name; return {card}; }
      if (path.endsWith('/state')) return {self:card, deck:[], deckCursor:null, mutuals:[], mutualCursor:null, lastVote:null, remaining:0, seen:0, mutualCount:0};
      throw Error(path);
    },
    subscribe(callback: (kind:string, cause?:string) => void) { listeners.add(callback); return () => listeners.delete(callback); },
    retainEvents: () => () => {},
  } as unknown as CloudClient;
  const preferences = vi.fn();
  const workspace = new MatchesWorkspace(client,new MemoryKeyValueStorage(), {
    current: () => true, blocked: () => false, profile: vi.fn(), privacy: vi.fn(), preferences,
  });
  cleanup.push(() => workspace.destroy());
  document.body.append(workspace.element); workspace.setVisible(true);
  await vi.advanceTimersByTimeAsync(1);
  const root = workspace.element.querySelector<HTMLElement>('.kl-matches-swipe')!;
  const button = (label:string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === label)!;
  const mutual = root.querySelectorAll<HTMLButtonElement>('.tab')[1]!;
  mutual.click();
  expect(Array.from(root.querySelectorAll('.heading button'), item => item.textContent)).toEqual(['Browse', 'Match Settings', 'Preferences', 'Edit Card']);
  button('Preferences').click();
  expect(preferences).toHaveBeenCalledTimes(1);
  const edit = button('Edit Card'); edit.focus(); edit.click();
  expect(document.activeElement).toBe(root.querySelector('.setupPanel h2'));
  const field = root.querySelector<HTMLInputElement>('.input')!;
  field.value = 'Changed'; field.focus();
  for (const listener of listeners) { listener('profiles-cleared','ready'); listener('ready'); }
  await vi.advanceTimersByTimeAsync(1);
  expect(document.activeElement).toBe(field);
  expect(field.value).toBe('Changed');
  root.querySelector('form')!.requestSubmit();
  await vi.advanceTimersByTimeAsync(1);
  expect(card.name).toBe('Changed');
  expect(mutual.getAttribute('aria-current')).toBe('page');
  expect(document.activeElement).toBe(edit);
  expect(root.querySelector('form')).toBeNull();
  button('Match Settings').click();
  await vi.advanceTimersByTimeAsync(1);
  const catalog = workspace.element.querySelector<HTMLElement>('.kl-matches-catalog')!;
  expect(catalog.hidden).toBe(false);
  expect(catalog.querySelector('dialog[open]')?.getAttribute('data-layout')).toBe('signal-editor');
  expect(catalog.querySelector('[aria-label="Matching information"]')).toBeNull();
});
