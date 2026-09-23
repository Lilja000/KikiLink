// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {GroupLiveView} from '../src/cloud/group-live';
import {SocialUI} from '../src/cloud/social-ui';
import {CloudPresence} from '../src/cloud/presence';
import {CloudClient,CloudError} from '../src/cloud/client';
import {syncInitialProfile} from '../src/cloud/profile-sync';
import {MemoryKeyValueStorage,SettingsStore} from '../src/core/settings';
import type {CloudGroup,CloudProfile} from '../src/cloud/types';
const stop:Array<()=>void>=[];
afterEach(()=>{stop.splice(0).forEach(f=>f());vi.useRealTimers();vi.restoreAllMocks();document.body.replaceChildren();});
const group={id:'g',conversationId:'c'} as CloudGroup;
const profile=(memberNumber=202):CloudProfile=>({memberNumber,displayName:memberNumber===202?'Kiki':'Snowy',bio:'',avatarFrame:'none',profileStyle:'classic',revision:1,visible:true,updatedAt:1,avatarId:null,bannerId:null});
function setup(handler:(method:string,path:string,body?:unknown)=>Promise<unknown>){
 const listeners=new Set<(kind:string)=>void>();
 const client={memberNumber:101,connected:true,request:vi.fn(handler),profile:vi.fn(async(n:number)=>profile(n)),subscribe:(f:(kind:string)=>void)=>{listeners.add(f);return()=>listeners.delete(f);}} as unknown as CloudClient;
 const ui=new SocialUI({client,isBlocked:n=>n===404,openProfile:vi.fn(),image:()=>document.createElement('span'),run:async f=>{await f();}});
 return {client,ui,emit:(kind:string)=>listeners.forEach(f=>f(kind))};
}
it('shows names for concurrent typists, expires hints, and stops updates after leaving',async()=>{
 vi.useFakeTimers();
 const {ui,client}=setup(async()=>({members:[],typing:[{memberNumber:202,expiresInMs:4000},{memberNumber:303,expiresInMs:2000},{memberNumber:404,expiresInMs:6000}]}));
 const live=new GroupLiveView(ui,group,vi.fn());stop.push(()=>live.destroy());live.resume();await live.refresh();
 expect(live.element.textContent).toBe('Kiki, Snowy are typing');expect(live.element.querySelectorAll('.kl-typing-dots i')).toHaveLength(3);
 const dots=live.element.querySelector('.kl-typing-dots'), nameText=live.element.querySelector('.kl-typing-name')!.firstChild;
 await live.refresh();expect(live.element.querySelector('.kl-typing-dots')).toBe(dots);expect(live.element.querySelector('.kl-typing-name')!.firstChild).toBe(nameText);
 await vi.advanceTimersByTimeAsync(2030);expect(live.element.textContent).toBe('Kiki is typing');
 expect(live.element.querySelector('.kl-typing-dots')).toBe(dots);
 await vi.advanceTimersByTimeAsync(2030);expect(live.element.hidden).toBe(true);
 live.pause();const calls=vi.mocked(client.request).mock.calls.length;await vi.advanceTimersByTimeAsync(60000);expect(client.request).toHaveBeenCalledTimes(calls);
});
it('serializes typing/stop signals, throttles repeats and never sends draft content',async()=>{
 vi.useFakeTimers();let done!:()=>void;
 const {ui,client}=setup(async(method)=>method==='PUT'?new Promise<void>(resolve=>{done=resolve;}):{members:[],typing:[]});
 const live=new GroupLiveView(ui,group,vi.fn());stop.push(()=>live.destroy());live.resume();await live.refresh();
 live.signal(true);live.signal(true);await Promise.resolve();
 expect(vi.mocked(client.request).mock.calls.filter(c=>c[0]==='PUT')).toHaveLength(1);
 live.pause();await Promise.resolve();expect(vi.mocked(client.request).mock.calls.filter(c=>c[0]==='PUT')).toHaveLength(1);
 done();await vi.advanceTimersByTimeAsync(0);
 expect(vi.mocked(client.request).mock.calls.filter(c=>c[0]==='PUT').map(c=>c[2])).toEqual([{typing:true},{typing:false}]);done();
});
it('updates availability once per minute and honors disabled presence',async()=>{
 vi.useFakeTimers();let status:'online'|'offline'='online';const {client}=setup(async()=>{});
 const presence=new CloudPresence(client,()=>status);stop.push(()=>presence.destroy());await vi.advanceTimersByTimeAsync(0);
 presence.update();expect(client.request).toHaveBeenCalledTimes(1);
 status='offline';presence.update();await vi.advanceTimersByTimeAsync(0);
 expect(client.request).toHaveBeenLastCalledWith('PUT','/v1/presence',{status:'offline'});
});
it('automatically publishes all existing public fields without opening an editor, then keeps returning-device Cloud changes',async()=>{
 const {client}=setup(async(method,_path,body)=>method==='GET'?{features:{fullProfile:true}}:{...body as object,memberNumber:101,revision:1});
 const storage=new MemoryKeyValueStorage(), settings=new SettingsStore(storage).get();
 settings.linkPresence={...settings.linkPresence,enabled:true,bio:'Writer',statusMessage:'Mapping',avatarFrame:'moon',profileStyle:'midnight',profileOutlineColor:'#112233'};
 const value=await syncInitialProfile(client,settings,'Kiki',undefined,storage,()=>true);
 expect(value).toMatchObject({displayName:'Kiki',bio:'Writer',statusMessage:'Mapping',avatarFrame:'moon',profileStyle:'midnight',profileOutlineColor:'#112233'});
 const calls=vi.mocked(client.request).mock.calls.length;
 const reset={...value!,bio:'',statusMessage:'',avatarFrame:'none' as const,profileStyle:'classic' as const};
 expect(await syncInitialProfile(client,settings,'Kiki',reset,new MemoryKeyValueStorage(),()=>true)).toEqual(reset);
 expect(client.request).toHaveBeenCalledTimes(calls);
});
it('never recreates a deleted profile, writes after account teardown, or overwrites a concurrent edit',async()=>{
 const {client}=setup(async(method)=>{if(method==='GET')return {features:{fullProfile:true}};throw new CloudError('revision_conflict',409);});
 const settings=new SettingsStore(new MemoryKeyValueStorage()).get();
 await syncInitialProfile(client,settings,'Kiki',{...profile(101),isDefault:true,autoPublishAllowed:false},undefined,()=>true);expect(client.request).not.toHaveBeenCalled();
 await syncInitialProfile(client,settings,'Kiki',undefined,undefined,()=>false);expect(vi.mocked(client.request).mock.calls.some(c=>c[0]==='PUT')).toBe(false);
 expect(await syncInitialProfile(client,settings,'Kiki',undefined,undefined,()=>true)).toEqual(profile(101));
 expect(client.profile).toHaveBeenCalledWith(101,true);
});
