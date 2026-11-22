// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudError, type CloudClient } from '../src/cloud/client';
import { ProfileFriends } from '../src/modules/platform-shell/profile-friends';
import { ProfileCommunities } from '../src/modules/platform-shell/profile-communities';

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const close of cleanups.splice(0)) close();
  vi.useRealTimers();
  document.body.replaceChildren();
});

function pending<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((ok, fail) => { resolve=ok; reject=fail; });
  return { promise, resolve, reject };
}

function setup(kind: 'friends'|'communities', read: (path: string) => Promise<unknown>) {
  vi.useFakeTimers();
  let emit!: (kind: string, cause?: string) => void;
  const request = vi.fn((_method: string, path: string) => path === '/v1/me'
    ? Promise.resolve({ memberNumber: 1, features: { profileFriends: true, profileCommunities: true } }) : read(path));
  const client = { memberNumber: 1, connected: true, origin: 'https://example.test', request,
    retainEvents: () => () => {}, subscribe: (fn: typeof emit) => { emit=fn; return () => {}; } } as unknown as CloudClient;
  const open=vi.fn();
  const blocked=new Set<number>();
  const options={current:()=>true, privacy:vi.fn(), open};
  const view=kind==='friends' ? new ProfileFriends(client,{...options, blocked: n => blocked.has(n)}) : new ProfileCommunities(client,options);
  document.body.append(view.element);
  cleanups.push(() => view.destroy());
  view.open(2);
  return {root:view.element,view,emit,open,request,blocked};
}

const friends=(ids:number[], nextCursor:number|null=null) => ({memberNumber:2,scope:'mutual',nextCursor,
  items:ids.map(memberNumber=>({memberNumber,displayName:'Friend '+memberNumber,username:null}))});
const communityId='aaaaaaaa-0000-0000-0000-000000000001';
const communities=(present:boolean) => ({memberNumber:2,nextCursor:null,items:present?[{
  id:communityId,name:'Garden',access:'public',description:'',shared:true}]:[]});

describe('profile social sections', () => {
  it.each(['friends','communities'] as const)('keeps the confirmed empty %s section across an SSE reconnect and temporary error',async kind=>{
    const page=kind==='friends'?friends([]):communities(false);
    let result=Promise.resolve<unknown>(page);
    const {root,emit,request}=setup(kind,()=>result);
    expect(root.textContent).toContain('Checking');
    await vi.advanceTimersByTimeAsync(0);
    const empty=root.querySelector('p')!;
    const menu=root.querySelector('details')!;
    menu.open=true;
    const summary=menu.querySelector('summary')!;
    summary.focus();
    const wait=pending<unknown>();result=wait.promise;
    emit('profiles-cleared','ready');emit('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(request.mock.calls.filter(([,p])=>p!=='/v1/me')).toHaveLength(2);
    expect(root.querySelector('p')).toBe(empty);
    expect(document.activeElement).toBe(summary);
    wait.reject(new CloudError('timeout',503));
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector('p')).toBe(empty);
    expect(menu.open).toBe(true);
    result=Promise.resolve(page);emit('ready');
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector('p')).toBe(empty);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('keeps both pages usable and in server order during the minute poll',async()=>{
    let first=Promise.resolve<unknown>(friends([20,15,10],10));
    const {root,open}=setup('friends',p=>p.endsWith('cursor=0')?first:Promise.resolve(friends([8,6])));
    await vi.advanceTimersByTimeAsync(0);
    const more=[...root.querySelectorAll('button')].find(x=>x.textContent==='More friends')!;
    more.focus();more.click();
    await vi.advanceTimersByTimeAsync(0);
    const kept=root.querySelector<HTMLButtonElement>('[data-member-number="8"]')!;
    expect(document.activeElement).toBe(kept);
    const wait=pending<unknown>(); first=wait.promise;
    await vi.advanceTimersByTimeAsync(60000);
    expect(kept.isConnected).toBe(true);kept.click();expect(open).toHaveBeenCalledWith(8,'Friend 8');
    wait.resolve(friends([22,15,10],10));await vi.advanceTimersByTimeAsync(0);
    expect([...root.querySelectorAll<HTMLElement>('[data-member-number]')].map(n=>n.dataset.memberNumber)).toEqual(['22','15','10','8','6']);
    expect(root.querySelector('[data-member-number="8"]')).toBe(kept);
    expect(document.activeElement).toBe(kept);
  });

  it.each(['friends','communities'] as const)('revokes protected %s rows immediately and ignores stale completions',async kind=>{
    const page=kind==='friends'?friends([10]):communities(true);
    let result=Promise.resolve<unknown>(page);
    const {root,emit}=setup(kind,()=>result);
    await vi.advanceTimersByTimeAsync(0);
    const selector='[data-member-number],[data-community-id]';
    const oldRow=root.querySelector(selector)!;
    const stale=pending<unknown>();result=stale.promise;
    emit('ready');await vi.advanceTimersByTimeAsync(0);
    expect(oldRow.isConnected).toBe(true);
    const denied=pending<unknown>();result=denied.promise;
    emit('privacy');
    expect(oldRow.isConnected).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    stale.resolve(page);denied.reject(new CloudError('private',403));
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector(selector)).toBeNull();
    expect(root.textContent).toMatch(/private/i);
  });

  it.each(['friends','communities'] as const)('rejects wrong-owner %s data during a silent refresh',async kind=>{
    const page=kind==='friends'?friends([10]):communities(true);
    let result=Promise.resolve<unknown>(page);
    const {root,emit}=setup(kind,()=>result);
    await vi.advanceTimersByTimeAsync(0);
    const selector='[data-member-number],[data-community-id]';
    expect(root.querySelector(selector)).not.toBeNull();
    result=Promise.resolve({...page,memberNumber:99});
    emit('ready');await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector(selector)).toBeNull();
    expect(root.querySelector('.kl-profile-read-retry')).not.toBeNull();
  });

  it('offers a working retry after an initial failure',async()=>{
    let read=()=>Promise.reject<unknown>(new Error('offline'));
    const {root}=setup('friends',()=>read());
    await vi.advanceTimersByTimeAsync(0);
    expect(root.textContent).toContain('could not load');
    read=()=>Promise.resolve(friends([10]));
    root.querySelector<HTMLButtonElement>('.kl-profile-read-retry')!.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector('[data-member-number="10"]')).not.toBeNull();
  });
});
