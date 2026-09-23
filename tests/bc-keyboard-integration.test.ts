// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { BCAdapter } from '../src/bc/adapter';
import { EventBus } from '../src/core/event-bus';
import type { KikiLinkEvents } from '../src/core/types';

it('guards the native BC key entry before map handling, keeps keyup, and tears down on restart', async () => {
  const hooks = new Map<string, number>(), downs = vi.fn(), ups = vi.fn();
  const oldSdk = Reflect.get(window, 'bcModSdk');
  const names = ['Player', 'GameKeyDown', 'GameKeyUp', 'GamePaste', 'ServerSocket', 'ServerSendBeepMessage', 'ServerAccountBeep', 'ServerAccountQueryResult', 'ChatRoomMessage', 'ServerSend'];
  const old = new Map(names.map(name => [name, Reflect.get(globalThis, name)]));
  Reflect.set(globalThis, 'Player', { MemberNumber: 999, Name: 'Fixture', FriendNames: new Map() });
  Reflect.set(globalThis, 'GameKeyDown', downs); Reflect.set(globalThis, 'GameKeyUp', ups); Reflect.set(globalThis, 'GamePaste', vi.fn());
  Reflect.set(globalThis, 'ServerSocket', { connected: true, on: vi.fn(), off: vi.fn() });
  for (const name of names.slice(5)) Reflect.set(globalThis, name, vi.fn());
  Object.defineProperty(window, 'bcModSdk', { configurable: true, value: { registerMod: () => ({ hookFunction: (name: string, priority: number, hook: (args: unknown[], next: (args: unknown[]) => unknown) => unknown) => {
    const original = Reflect.get(globalThis, name); hooks.set(name, priority);
    Reflect.set(globalThis, name, (...args: unknown[]) => hook(args, next => original(...next)));
    return () => { Reflect.set(globalThis, name, original); hooks.delete(name); };
  }, unload: vi.fn() }) } });
  const adapter = new BCAdapter(new EventBus<KikiLinkEvents>(), '0.30.0');
  const host = document.createElement('div'); host.id = 'kikilink-root'; const root = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('section'), input = document.createElement('textarea'); panel.append(input); root.append(panel); document.body.append(host);
  const listener = (e: Event) => Reflect.get(globalThis, 'GameKeyDown')(e); document.addEventListener('keydown', listener, true);
  const key = () => new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true, composed: true, cancelable: true });
  try {
    await adapter.start(); expect(hooks.get('GameKeyDown')).toBe(100); expect(hooks.has('GameKeyUp')).toBe(false);
    input.focus(); const event = key(); input.dispatchEvent(event); expect(downs).not.toHaveBeenCalled(); expect(event.defaultPrevented).toBe(false);
    Reflect.get(globalThis, 'GameKeyUp')(event); expect(ups).toHaveBeenCalledOnce();
    panel.hidden = true; input.dispatchEvent(key()); expect(downs).toHaveBeenCalledOnce();
    panel.hidden = false; input.dispatchEvent(key()); expect(downs).toHaveBeenCalledOnce();
    const native = document.createElement('input'); document.body.append(native); native.focus(); native.dispatchEvent(key()); expect(downs).toHaveBeenCalledTimes(2);
    adapter.stop(); expect(hooks.has('GameKeyDown')).toBe(false);
    await adapter.start(); input.focus(); input.dispatchEvent(key()); expect(downs).toHaveBeenCalledTimes(2);
    adapter.stop(); input.dispatchEvent(key()); expect(downs).toHaveBeenCalledTimes(3);
  } finally {
    adapter.stop(); document.removeEventListener('keydown', listener, true); document.body.replaceChildren();
    Object.defineProperty(window, 'bcModSdk', { configurable: true, value: oldSdk });
    for (const [name, value] of old) { if (value === undefined) Reflect.deleteProperty(globalThis, name); else Reflect.set(globalThis, name, value); }
  }
});
