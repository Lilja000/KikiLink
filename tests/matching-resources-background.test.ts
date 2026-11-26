// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_MATCH_SIGNAL } from '../cloud/shared/matching.mjs';
import { rankResource } from '../cloud/shared/matching-resources.mjs';
import { CloudError, type CloudClient } from '../src/cloud/client';
import { MemoryKeyValueStorage } from '../src/core/settings';
import { MatchingResourcesPage } from '../src/modules/platform-shell/matching-resources-page';

const close: (() => void)[] = [];
afterEach(() => { close.splice(0).forEach(fn => fn()); vi.useRealTimers(); document.body.replaceChildren(); });

function resource(title: string) {
  return rankResource({ kind: 'groups', id: crypto.randomUUID(), title, description: '',
    host: { memberNumber: 202, name: 'Host', username: null }, revision: 1, community: null,
    intents: ['Friends'], languages: ['English'], interests: [], capacity: 5, members: 1, available: true,
    availability: 'Planning ahead', overlapMinutes: null, utcOffset: null, startsAt: null, endsAt: null,
    saved: false, hidden: false, choiceRevision: 0, canRequest: true, membership: 'none' }, DEFAULT_MATCH_SIGNAL);
}

function setup(read: (cursor: string) => unknown) {
  vi.useFakeTimers();
  let emit!: (kind: string, cause?: string) => void;
  const request = vi.fn(async (_method: string, path: string) => {
    if (path === '/v1/me') return { memberNumber: 101, features: { matchingResources: true, matchingPeople: true } };
    if (path === '/v1/matching/me') return { owner: 101, revision: 1, signal: { ...DEFAULT_MATCH_SIGNAL, published: true },
      canPublish: true, active: true, serverNow: Date.now() };
    const url = new URL(path, 'https://cloud.test');
    if (url.pathname === '/v1/matching/resources/groups') return read(url.searchParams.get('cursor') ?? '');
    throw Error('Unexpected request ' + path);
  });
  const client = { memberNumber: 101, origin: 'https://cloud.test', connected: true, request,
    retainEvents: () => () => {}, subscribe: (fn: typeof emit) => { emit=fn; return () => {}; } } as unknown as CloudClient;
  const page = new MatchingResourcesPage(client, new MemoryKeyValueStorage(), { current: () => true, blocked: () => false, profile: vi.fn() });
  document.body.append(page.element); close.push(() => page.destroy());
  page.setVisible(true);
  return { page, emit, request };
}
const batch = (items: ReturnType<typeof resource>[], nextCursor: string | null) =>
  ({ items, nextCursor, poolLimited: false, serverNow: Date.now() });

it('rechecks all visible pages and retains the menu, focus and rows when only the opaque cursor and server clock change', async () => {
  const first = resource('Garden'), second = resource('Book club');
  let serial = 0;
  const read = vi.fn((cursor: string) => cursor ? batch([second], null) : batch([first], String(++serial)));
  const { page, emit } = setup(read);
  await vi.advanceTimersByTimeAsync(0);
  const more = [...page.element.querySelectorAll('button')].find(b => b.textContent === 'Load more resources')!;
  const firstCard = page.element.querySelector('[data-resource-id]');
  emit('profiles-cleared', 'ready'); emit('ready');
  await vi.advanceTimersByTimeAsync(0);
  expect(read.mock.calls).toEqual([[''],['']]);
  expect(firstCard).toBe(page.element.querySelector('[data-resource-id]'));
  expect(more.isConnected).toBe(true);
  more.click(); await vi.advanceTimersByTimeAsync(0);
  expect(read).toHaveBeenLastCalledWith('2');
  const cards = [...page.element.querySelectorAll('[data-resource-id]')];
  const menu = page.element.querySelector<HTMLButtonElement>('.kl-match-options')!;
  menu.focus(); menu.click();
  const action = document.activeElement;
  await vi.advanceTimersByTimeAsync(60000);
  emit('matching'); await vi.advanceTimersByTimeAsync(0);
  expect(read.mock.calls.slice(-4)).toEqual([[''],['3'],[''],['4']]);
  expect(cards).toHaveLength(2); expect(cards.every(card => card.isConnected)).toBe(true);
  expect(document.activeElement).toBe(action); expect(menu.isConnected).toBe(true);
  expect(page.element.querySelector('dialog[role="menu"][open]')).not.toBeNull();
});

it('drops a pending background result when a privacy event revokes access', async () => {
  const group = resource('Private group');
  let result = Promise.resolve(batch([group], null));
  const { page, emit } = setup(() => result);
  await vi.advanceTimersByTimeAsync(0);
  const row = page.element.querySelector('[data-resource-id]')!;
  let finish!: (value: ReturnType<typeof batch>) => void;
  result = new Promise(resolve => { finish=resolve; });
  emit('matching'); await vi.advanceTimersByTimeAsync(0);
  expect(row.isConnected).toBe(true);
  result = Promise.resolve().then(() => { throw new CloudError('private', 403); });
  void result.catch(() => {});
  emit('privacy');
  expect(row.isConnected).toBe(false);
  finish(batch([group], null)); await vi.advanceTimersByTimeAsync(0);
  expect(page.element.querySelector('[data-resource-id]')).toBeNull();
});

it('shows a changed listing and ignores its stale copy after leaving the catalog', async () => {
  const group = resource('Garden');
  let result = Promise.resolve(batch([group], null));
  const { page, emit } = setup(() => result);
  await vi.advanceTimersByTimeAsync(0);
  result = Promise.resolve(batch([{...group, title: 'Garden meetings', revision: 2}], null));
  emit('matching'); await vi.advanceTimersByTimeAsync(0);
  expect(page.results.querySelector('.kl-match-name')?.textContent).toBe('Garden meetings');
  let finish!: (value: ReturnType<typeof batch>) => void;
  result = new Promise(resolve => { finish=resolve; });
  emit('ready'); await vi.advanceTimersByTimeAsync(0);
  page.setVisible(false);
  finish(batch([group], null)); await vi.advanceTimersByTimeAsync(0);
  expect(page.results.querySelector('[data-resource-id]')).toBeNull();
});
