// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import type { CloudClient } from '../src/cloud/client';
import { PeopleDirectoryFeed } from '../src/modules/platform-shell/people-directory-feed';
import { PeopleDiscovery } from '../src/modules/platform-shell/people-discovery';
import { PeopleRestrictions } from '../src/modules/platform-shell/people-restrictions';

const person = (memberNumber: number) => ({ memberNumber, displayName: 'Member ' + memberNumber, username: null });

function hold() {
  let done!: () => void;
  const waiting = new Promise<void>(resolve => { done = resolve; });
  return { waiting, done };
}

function fixture() {
  let notify!: (kind: string, cause?: string) => void;
  const source = {
    blockIds: [] as number[], gate: undefined as Promise<void> | undefined,
    pages: [[person(102)], [person(101)]],
  };
  const request = vi.fn(async (_method: string, path: string) => {
    if (path === '/v1/me') return { memberNumber: 1, features: { profileDiscovery: true } };
    await source.gate;
    if (path.startsWith('/v1/blocks')) return {items:source.blockIds.map(memberNumber => ({memberNumber}))};
    const cursor = new URL(path, 'https://unit.test').searchParams.get('cursor');
    return cursor === '0' ? {items:source.pages[0]!,nextCursor:source.pages[0]!.at(-1)?.memberNumber ?? null}
                         : {items:source.pages[1]!,nextCursor:null};
  });
  const client = { connected:true, memberNumber:1, origin:'https://cloud.test', retainEvents:()=>()=>{},
    subscribe: (fn: typeof notify) => { notify=fn;return ()=>{}; }, request, isProfileBlocked:()=>false } as unknown as CloudClient;
  return {source,client,request,emit:(kind:string,cause?:string)=>notify(kind,cause)};
}

afterEach(() => { document.body.replaceChildren(); });

it('keeps both People pages stable during stream resume, then immediately removes identities on privacy invalidation', async () => {
  const f=fixture(), changed=vi.fn();
  const view=new PeopleDirectoryFeed(f.client,{current:()=>true,blocked:()=>false,changed});
  try {
    view.show('');
    await vi.waitFor(()=>expect(view.items).toHaveLength(1));
    const paging = hold(); f.source.gate = paging.waiting;
    view.element.querySelector('button')!.click();
    f.emit('profiles-cleared','ready'); f.emit('ready');
    paging.done();
    await vi.waitFor(()=>expect(view.items).toHaveLength(2));
    changed.mockClear();
    const paused=hold(); f.source.gate=paused.waiting;
    f.emit('profiles-cleared','ready'); f.emit('ready');
    await vi.waitFor(()=>expect(f.request.mock.calls.filter(([,path])=>path.startsWith('/v1/people'))).toHaveLength(3));
    expect(view.items.map(row=>row.memberNumber)).toEqual([102,101]);
    expect(view.element.hidden).toBe(true);
    expect(changed).not.toHaveBeenCalled();
    paused.done();
    await vi.waitFor(()=>expect(f.request.mock.calls.filter(([,path])=>path.startsWith('/v1/people'))).toHaveLength(4));
    expect(view.items.map(row=>row.memberNumber)).toEqual([102,101]);
    expect(changed).not.toHaveBeenCalled();
    f.emit('profiles-cleared','privacy');
    expect(view.items).toEqual([]);
    expect(changed).toHaveBeenCalledOnce();
  } finally { view.destroy(); }
});

it('retains the same focused discovery result on an unchanged ready response and clears revoked rows immediately', async () => {
  const f=fixture(), view=new PeopleDiscovery(f.client,{current:()=>true,profile:vi.fn(),privacy:vi.fn()});
  document.body.append(view.element);
  try {
    view.open(); await vi.waitFor(()=>expect(view.element.querySelector('[data-member="102"]')).toBeTruthy());
    const node=view.element.querySelector<HTMLButtonElement>('[data-member="102"]')!;node.focus();
    const pending=hold();f.source.gate=pending.waiting;
    f.emit('profiles-cleared','ready');f.emit('ready');
    await vi.waitFor(()=>expect(f.request.mock.calls.filter(([,path])=>path.startsWith('/v1/people'))).toHaveLength(2));
    expect(view.element.textContent).not.toMatch(/Refreshing|Loading/);
    expect(document.activeElement).toBe(node);
    pending.done();await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(view.element.querySelector('[data-member="102"]')).toBe(node);
    f.emit('profile-discovery');expect(view.element.contains(node)).toBe(false);
  } finally { view.destroy(); }
});

it('validates blocks in the background without resetting ready and applies newly restricted members on completion',async()=>{
  const f=fixture(), changed=vi.fn();
  const blocks=new PeopleRestrictions(f.client,()=>true,changed);
  await blocks.load(); expect(blocks.state).toBe('ready'); changed.mockClear();
  const pending=hold();f.source.gate=pending.waiting;
  const refresh=blocks.load(true);
  expect(blocks.state).toBe('ready'); expect(changed).not.toHaveBeenCalled();
  f.source.blockIds=[102];pending.done();await refresh;
  expect([...blocks.members]).toEqual([102]);expect(changed).toHaveBeenCalledOnce();
  changed.mockClear();await blocks.load(true);expect(changed).not.toHaveBeenCalled();
  blocks.invalidate();expect(blocks.state).toBe('idle');
});
