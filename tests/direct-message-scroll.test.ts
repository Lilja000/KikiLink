// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import type {BCAdapter} from '../src/bc/adapter';
import type {CloudClient} from '../src/cloud/client';
import {CommunityService} from '../src/cloud/community';
import {CloudPanel} from '../src/cloud/panel';
import {MemoryKeyValueStorage, SettingsStore} from '../src/core/settings';
import {ChatService} from '../src/modules/link-chat/chat-service';
import {LinkChatView} from '../src/modules/link-chat/view';
import {MemoryChatRepository} from '../src/storage/memory-chat-repository';

const mode=vi.hoisted(()=>({platformPreview:true}));
vi.mock('../src/core/distribution',async original=>({
  ...await original<typeof import('../src/core/distribution')>(),
  get KIKILINK_PLATFORM_PREVIEW(){return mode.platformPreview;},
}));
const views:LinkChatView[]=[];
afterEach(()=>{
  views.splice(0).forEach(view=>view.destroy()); document.body.replaceChildren();
  vi.restoreAllMocks(); mode.platformPreview=true;
});

async function setup(platformPreview=true, readingLine=false) {
  mode.platformPreview=platformPreview;
  vi.spyOn(CommunityService.prototype,'start').mockImplementation(function(this:CommunityService){
    this.supported=this.directEnabled=this.directMessageMedia=true; return Promise.resolve();
  });
  vi.spyOn(CloudPanel.prototype,'messageImage').mockImplementation(()=>{
    const wrapper=document.createElement('div'); wrapper.className='kl-cloud-image-wrap'; wrapper.dataset.state='loading';
    return wrapper;
  });
  let owner=101,connected=true;
  const adapter={getOwnMemberNumber:()=>owner,getOwnName:()=> 'Kiki',getMemberName:()=> 'Seraphine',getMemberNickname:()=>undefined,
    getKnownContacts:()=>[],getPlayerRelationships:()=>[],getRoomCharacters:()=>[],getOnlineFriends:()=>[],
    getCurrentRoomName:()=>undefined,isInChatRoom:()=>false,canSendBeep:()=>true,isReady:()=>true,sendBeep:vi.fn(),
  } as unknown as BCAdapter;
  const storage=new MemoryKeyValueStorage(),settings=new SettingsStore(storage);
  const service=new ChatService(new MemoryChatRepository(),settings);
  const client={origin:'https://cloud.example.test',memberNumber:101,get connected(){return connected;},subscribe:()=>()=>{},destroy:vi.fn(),startEvents:vi.fn(),stopEvents:vi.fn(),
    peekProfile:()=>undefined,isProfileBlocked:()=>false,hasCachedAddonProfile:()=>false,profile:async()=>undefined,
    request:vi.fn(async(_method:string,path:string)=>path==='/v1/me'?{memberNumber:101}:{items:[],cursor:0,nextCursor:null}),
  } as unknown as CloudClient;
  await service.captureCloud({direction:'incoming',peerNumber:202,peerName:'Seraphine',content:'A received image',sentAt:Date.now(),includeRoom:false},
    {id:'received-image',cloudId:crypto.randomUUID(),cloudMediaIds:[crypto.randomUUID()]},true);
  if(readingLine)await service.capture({direction:'incoming',peerNumber:202,peerName:'Seraphine',
    content:'The line I am reading below the loading image',sentAt:Date.now()+1,includeRoom:false},true);
  const view=new LinkChatView(adapter,service,settings,'2.0.0'); views.push(view);
  view.attachCloud(client,storage); view.mount(); await view.openChat(202,'Seraphine');
  const root=document.querySelector('#kikilink-root')!.shadowRoot!;
  const history=root.querySelector<HTMLElement>('.kl-messages')!,image=root.querySelector<HTMLElement>('.kl-direct-private-images .kl-cloud-image-wrap')!;
  let top=600,total=1000;
  Object.defineProperties(history,{
    scrollHeight:{configurable:true,get:()=>total},clientHeight:{configurable:true,value:400},
    scrollTop:{configurable:true,get:()=>top,set:(value:number)=>{top=Math.max(0,Math.min(value,total-400));}},
  });
  return {view,root,history,image,client,adapter,service,
    expand:()=>{total=1144;},switchOwner:()=>{owner=303;},disconnect:()=>{connected=false;},
    paint:()=>{image.dispatchEvent(new Event('cloud-image-before-paint'));total=1144;image.dataset.state='ready';image.dispatchEvent(new Event('cloud-image-ready'));},
  };
}

it.each([{backscroll:0,expected:744},{backscroll:50,expected:550}])(
  'loads a received Direct image with $backscroll px deliberate scrollback',async({backscroll,expected})=>{
  const h=await setup(); h.history.scrollTop-=backscroll; h.paint(); expect(h.history.scrollTop).toBe(expected);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
  expect((await h.service.getMessages(202))[0]?.cloudMediaIds).toHaveLength(1);
});

it.each(['account','conversation','closed','disconnected','detached'] as const)(
  'ignores a captured Direct image tail after its source becomes %s',async reason=>{
    const h=await setup(); h.image.dispatchEvent(new Event('cloud-image-before-paint'));
    if(reason==='account')h.switchOwner();
    if(reason==='conversation')await h.view.openChat(303,'Another conversation');
    if(reason==='closed')h.view.close();
    if(reason==='disconnected')h.disconnect();
    if(reason==='detached')h.image.remove();
    h.history.scrollTop=150; h.expand(); h.image.dispatchEvent(new Event('cloud-image-ready'));
    expect(h.history.scrollTop).toBe(150); expect(h.adapter.sendBeep).not.toHaveBeenCalled();
  });

it('preserves the existing legacy received-image near-tail behavior',async()=>{
  const h=await setup(false); h.history.scrollTop=550; h.paint(); expect(h.history.scrollTop).toBe(744);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it.each([false,true])('preserves a Direct reading line after image growth, including native anchoring=%s',async nativeAnchoring=>{
  const h=await setup(true,true); h.history.scrollTop=550;
  const bodies=h.root.querySelectorAll<HTMLElement>('.kl-messages .kl-message-content');
  const reading=bodies[1]!; let growth=0;
  vi.spyOn(h.history,'getBoundingClientRect').mockReturnValue(new DOMRect(0,100,600,400));
  vi.spyOn(bodies[0]!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-200,600,100));
  const lineRect=()=>new DOMRect(0,100+700+growth-h.history.scrollTop,500,18);
  vi.spyOn(reading,'getBoundingClientRect').mockImplementation(lineRect);
  const createRange=document.createRange.bind(document);
  vi.spyOn(document,'createRange').mockImplementation(()=>{
    const range=createRange(); Object.defineProperty(range,'getClientRects',{value:()=>[lineRect()]}); return range;
  });
  const before=lineRect().top;
  h.image.dispatchEvent(new Event('cloud-image-before-paint')); h.expand(); growth=144;
  if(nativeAnchoring)h.history.scrollTop+=growth;
  h.image.dispatchEvent(new Event('cloud-image-ready'));
  expect(h.history.scrollTop).toBe(694); expect(lineRect().top).toBe(before);
  expect(h.history.scrollHeight-h.history.scrollTop-h.history.clientHeight).toBe(50);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it.each(['scroll','viewport'] as const)('does not override a later Direct %s intent with a captured reading line',async change=>{
  const h=await setup(true,true); h.history.scrollTop=550;
  const bodies=h.root.querySelectorAll<HTMLElement>('.kl-messages .kl-message-content');
  let growth=0;
  vi.spyOn(h.history,'getBoundingClientRect').mockReturnValue(new DOMRect(0,100,600,400));
  vi.spyOn(bodies[0]!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-200,600,100));
  const lineRect=()=>new DOMRect(0,100+700+growth-h.history.scrollTop,500,18);
  vi.spyOn(bodies[1]!,'getBoundingClientRect').mockImplementation(lineRect);
  const createRange=document.createRange.bind(document);
  vi.spyOn(document,'createRange').mockImplementation(()=>{
    const range=createRange(); Object.defineProperty(range,'getClientRects',{value:()=>[lineRect()]}); return range;
  });
  h.image.dispatchEvent(new Event('cloud-image-before-paint')); h.expand(); growth=144;
  if(change==='scroll')h.history.scrollTop=500;
  else Object.defineProperty(h.history,'clientHeight',{configurable:true,value:350});
  const expected=h.history.scrollTop; h.image.dispatchEvent(new Event('cloud-image-ready'));
  expect(h.history.scrollTop).toBe(expected); expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it('returns to the same Direct row and opens it in reading mode on a one-pane layout',async()=>{
  const {root,view}=await setup();
  const panel=root.querySelector<HTMLElement>('.kl-panel')!;
  Object.defineProperty(panel,'clientWidth',{configurable:true,value:377});
  const back=root.querySelector<HTMLButtonElement>('.kl-chat-header .kl-back')!;
  const composer=root.querySelector<HTMLTextAreaElement>('.kl-composer-input')!;
  const opener=root.querySelector<HTMLButtonElement>('[data-conversation-key="direct:202"]')!;
  back.click();
  expect(panel.dataset.mobileView).toBe('list');
  expect(root.activeElement).toBe(opener);
  opener.click();
  await vi.waitFor(()=>expect(panel.dataset.mobileView).toBe('chat'));
  expect(root.activeElement).toBe(back);
  await view.openChat(202,'Seraphine',true);
  expect(root.activeElement).toBe(composer);
  root.querySelector<HTMLInputElement>('.kl-chat-unread-only input')!.click();
  await vi.waitFor(()=>expect(root.contains(opener)).toBe(false));
  back.click();
  expect(root.activeElement).toBe(root.querySelector('.kl-chat-inbox'));
});
