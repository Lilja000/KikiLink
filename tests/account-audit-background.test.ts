// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import type { CloudClient } from '../src/cloud/client';
import { AccountSettings } from '../src/modules/platform-shell/account-settings';
import { SafetyActivity } from '../src/modules/platform-shell/safety-activity';

it('keeps ordinary audit rows and the focused filter mounted through a scheduled access check', async () => {
  vi.useFakeTimers();
  const source='a'.repeat(32);
  let pause: Promise<void> | undefined, finish: (()=>void) | undefined;
  const request=vi.fn(async (_method:string,path:string)=>{
    await pause;
    return path==='/v1/me' ? {memberNumber:1,features:{localSafetyActivity:true},directRecovery:{generation:source}}
      : {memberNumber:1,platform:false,recoveryGeneration:source,items:[]};
  });
  const client={connected:true,memberNumber:1,origin:'https://cloud.test',request} as unknown as CloudClient;
  const activity=new SafetyActivity(client);
  activity.record('connected');
  const page=new AccountSettings(undefined,activity,{navigate:vi.fn(),editPrivacy:vi.fn(),editPreferences:vi.fn()});
  try {
    document.body.append(page.element);page.show('audit');
    await vi.advanceTimersByTimeAsync(1);
    const input=page.element.querySelector<HTMLSelectElement>('.kl-audit-filter')!;
    input.focus();expect(document.activeElement).toBe(input);
    expect(page.element.textContent).toContain('Connected to Cloud');
    pause=new Promise<void>(done=>{finish=done;});
    await vi.advanceTimersByTimeAsync(20_000);
    expect(request.mock.calls.filter(([,path])=>path==='/v1/me')).toHaveLength(2);
    expect(page.element.querySelector('.kl-audit-filter')).toBe(input);
    finish!();await vi.advanceTimersByTimeAsync(1);
    expect(document.activeElement).toBe(input);
  } finally { page.destroy();activity.destroy();document.body.replaceChildren();vi.useRealTimers(); }
});
