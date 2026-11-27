// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { CloudError, type CloudClient } from '../src/cloud/client';
import { MemoryKeyValueStorage } from '../src/core/settings';
import { DEFAULT_MATCH_SIGNAL, rankMatch } from '../cloud/shared/matching.mjs';
import { MatchingPage } from '../src/modules/platform-shell/matching-page';
import { ProfileLocation } from '../src/modules/platform-shell/profile-location';

const clean: Array<() => void> = [];
afterEach(() => { clean.splice(0).forEach(fn => fn()); document.body.replaceChildren(); vi.useRealTimers(); });
const flush = () => vi.advanceTimersByTimeAsync(0);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function cloud(read: (path: string) => Promise<unknown>) {
  vi.useFakeTimers();
  const listeners = new Set<(kind: string, cause?: string) => void>();
  const request = vi.fn((_method: string, path: string) => read(path));
  const client = { memberNumber: 1, connected: true, origin: 'https://example.test', request,
    subscribe(fn: (kind: string, cause?: string) => void) { listeners.add(fn); return () => listeners.delete(fn); },
    retainEvents: () => () => {} } as unknown as CloudClient;
  return { client, request, emit: (kind: string, cause?: string) => listeners.forEach(fn => fn(kind, cause)) };
}
const candidate = (memberNumber: number) => rankMatch({
  memberNumber, name: 'Friend ' + memberNumber, username: null, note: 'Hello', intents: ['Friends'],
  languages: ['English'], size: 'Either', signalRevision: 1, expiresAt: null, interests: [],
  interestsShared: false, availability: null, status: null, compatibility: null, mutualCount: null,
  communities: [], connectionsShared: false, overlapMinutes: null, saved: false, hidden: false, choiceRevision: 0, canRequest: true,
}, DEFAULT_MATCH_SIGNAL);

it('preserves both loaded pages, focus and controls through unrelated matching and stream-ready hints', async () => {
  let cursorRevision = 0;
  let note = 'Hello';
  let failing = false;
  let hold: Promise<void> = Promise.resolve();
  let show = true;
  const { client, emit, request } = cloud(async path => {
    if (path === '/v1/me') return { memberNumber: 1, features: { matchingPeople: true } };
    if (path === '/v1/matching/me') return { owner: 1, revision: 1, signal: DEFAULT_MATCH_SIGNAL,
      active: false, canPublish: true, serverNow: Date.now() };
    if (!path.startsWith('/v1/matching/people?')) throw Error(path);
    const cursor = new URL(path, client.origin).searchParams.get('cursor');
    if (failing) throw new CloudError('timeout', 503);
    const row = candidate(cursor ? 3 : 2);
    if (!cursor) row.note = note;
    const result = { items: show ? [row] : [], nextCursor: show && !cursor ? 'page-' + cursorRevision++ : null,
      poolLimited: false, serverNow: Date.now() };
    await hold;
    return result;
  });
  const matches = new MatchingPage(client, new MemoryKeyValueStorage(), {
    current: () => true, blocked: () => false, profile: vi.fn(), privacy: vi.fn(), preferences: vi.fn(),
  });
  clean.push(() => matches.destroy()); document.body.append(matches.element); matches.setVisible(true); await flush();
  const root = matches.element;
  [...root.querySelectorAll('button')].find(b => b.textContent === 'Load more suggestions')!.click();
  await flush();
  const second = root.querySelector<HTMLElement>('[data-member="3"]')!;
  const button = second.querySelector('button')!; button.focus();
  const wait = deferred<void>(); hold = wait.promise;
  const before = request.mock.calls.filter(([,p]) => p.startsWith('/v1/matching/people?')).length;
  emit('profiles-cleared', 'ready'); emit('ready'); emit('matching'); await flush();
  expect(request.mock.calls.filter(([,p]) => p.startsWith('/v1/matching/people?'))).toHaveLength(before + 1);
  expect(second.isConnected).toBe(true); expect(document.activeElement).toBe(button);
  expect(root.querySelector('.kl-match-catalog-loading')).toBeNull();
  wait.resolve(); await flush();
  expect(request.mock.calls.filter(([,p]) => p.startsWith('/v1/matching/people?'))).toHaveLength(before + 2);
  expect(second.isConnected).toBe(true); expect(document.activeElement).toBe(button);

  note = 'Updated about me'; emit('matching'); await flush();
  expect(root.textContent).toContain(note);
  expect(second.isConnected).toBe(true); expect(document.activeElement).toBe(button);
  failing = true; emit('matching'); await flush();
  expect(second.isConnected).toBe(true); expect(root.querySelector('.kl-match-catalog-error')).toBeNull();
  await vi.advanceTimersByTimeAsync(60001);
  expect(root.querySelector('[data-member]')).toBeNull(); expect(root.querySelector('.kl-match-catalog-error')).not.toBeNull();
  failing = false;
  await matches.refresh();
  const restored = root.querySelector('[data-member="2"]')!;
  const stale = deferred<void>(); hold = stale.promise;
  emit('matching'); await flush();
  show = false; hold = Promise.resolve(); emit('privacy');
  expect(restored.isConnected).toBe(false);
  await flush(); stale.resolve(); await flush();
  expect(root.querySelector('[data-member]')).toBeNull();
});

it('keeps the location fact stable and expires it during a slow recheck; privacy clears it immediately', async () => {
  let hold: Promise<void> = Promise.resolve();
  let name = 'Garden';
  let failing = false;
  const {client, emit, request} = cloud(async path => {
    if (path === '/v1/me') return { memberNumber: 1, features: { profileLocation: true } };
    if (failing) throw new CloudError('timeout', 503);
    const result = { memberNumber: 2, room: { name, space: 'X' }, expiresInMs: 90000 };
    await hold;
    return result;
  });
  const panel = new ProfileLocation(client, () => true); clean.push(() => panel.destroy());
  document.body.append(panel.element); panel.open(2); await flush();
  const value = panel.element.querySelector('strong')!, button = panel.element.querySelector('button')!;
  button.focus(); emit('profiles-cleared', 'ready'); emit('ready'); emit('profile-location'); await flush();
  expect(request.mock.calls.filter(([,p]) => p !== '/v1/me')).toHaveLength(2);
  expect(value.textContent).toBe('Garden'); expect(document.activeElement).toBe(button);
  failing = true; emit('profile-location'); await flush(); expect(value.textContent).toBe('Garden');
  failing = false;
  const stale = deferred<void>(); hold = stale.promise;
  await vi.advanceTimersByTimeAsync(60000); expect(value.textContent).toBe('Garden');
  await vi.advanceTimersByTimeAsync(30001); expect(value.textContent).toBe('Not shared or offline');
  name = 'Library'; hold = Promise.resolve(); emit('privacy'); await flush();
  expect(value.textContent).toBe('Library'); stale.resolve(); await flush();
  expect(value.textContent).toBe('Library'); expect(document.activeElement).toBe(button);
  emit('privacy'); expect(value.textContent).not.toBe('Library');
});
