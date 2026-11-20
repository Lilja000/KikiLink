// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import type {BCAdapter} from '../src/bc/adapter';
import {EventBus} from '../src/core/event-bus';
import {MemoryKeyValueStorage, SettingsStore} from '../src/core/settings';
import {ChatService} from '../src/modules/link-chat/chat-service';
import {LinkChatView} from '../src/modules/link-chat/view';
import {LinkPresenceService} from '../src/modules/link-presence/link-presence-service';
import {MemoryChatRepository} from '../src/storage/memory-chat-repository';

const mode=vi.hoisted(()=>({platformPreview:true}));
vi.mock('../src/core/distribution',async original=>({
  ...await original<typeof import('../src/core/distribution')>(),
  get KIKILINK_PLATFORM_PREVIEW(){return mode.platformPreview;},
}));

const views:LinkChatView[]=[];
afterEach(()=>{
  views.splice(0).forEach(view=>view.destroy());
  document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();
  mode.platformPreview=true;
});

async function setup(own:number,peer:number,platformPreview=true){
  mode.platformPreview=platformPreview;
  const adapter={
    getMemberName:()=> 'Kiki',getMemberNickname:()=>undefined,
    getOwnMemberNumber:()=>own,getOwnName:()=> 'Kiki',getKnownContacts:()=>[],
    getRoomCharacters:()=>[],getCurrentRoomName:()=>undefined,
    isInChatRoom:()=>false,isMemberInCurrentRoom:()=>false,isKnownFriend:()=>false,
    getPlayerRelationships:()=>[],getOnlineFriends:()=>[],getOnlineFriend:()=>undefined,
    hasOnlineFriendSnapshot:()=>true,getOnlineFriendsUpdatedAt:()=>Date.now(),
    canSendBeep:()=>true,isReady:()=>true,sendBeep:vi.fn(),sendKikiLinkProtocol:vi.fn(),
    getRoomSearchSpace:()=> 'X',searchRooms:vi.fn(async()=>[]),
    getCurrentLobbyRoom:()=>undefined,getRoomAdminSnapshot:()=>undefined,
  } as unknown as BCAdapter;
  const settings=new SettingsStore(new MemoryKeyValueStorage());
  const service=new ChatService(new MemoryChatRepository(),settings,own);
  const now=Date.now();
  for(const [direction,sentAt]of [['incoming',now-120000],['outgoing',now-60000]] as const){
    await service.capture({direction,peerNumber:peer,peerName:'Kiki',content:`${direction} message`,sentAt,includeRoom:false},false);
  }
  const presence=new LinkPresenceService(adapter,settings,new EventBus(),'2.0.0');
  const view=new LinkChatView(adapter,service,settings,'2.0.0',undefined,undefined,presence);views.push(view);
  view.mount();await view.openChat(peer,'Kiki');
  const root=document.querySelector('#kikilink-root')!.shadowRoot!;
  return {root,adapter,view,service,presence};
}

it.each([
  {own:72385,peer:202,creatorDirection:'outgoing'},
  {own:101,peer:72385,creatorDirection:'incoming'},
])('marks only trusted creator identity when own $own and peer $peer share the same name',async({own,peer,creatorDirection})=>{
  const h=await setup(own,peer);
  for(const direction of ['incoming','outgoing']){
    const row=h.root.querySelector<HTMLElement>(`.kl-message-row[data-direction="${direction}"]`)!;
    expect(row.querySelector('.kl-message-content')?.textContent).toBe(`${direction} message`);
    const name=row.querySelector<HTMLElement>('.kl-chat-message-author-name')!;
    expect(name.textContent).toBe('Kiki');
    expect(name.dataset.creator).toBe(String(direction===creatorDirection));
    const badges=row.querySelectorAll('[role="img"][aria-label="Administrator"]');
    expect(badges).toHaveLength(direction===creatorDirection?1:0);
  }
  expect(h.root.querySelectorAll('.kl-chat-message-author-name[data-creator="true"]')).toHaveLength(1);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it('keeps creator author decoration out of legacy Direct messages',async()=>{
  const h=await setup(72385,202,false);
  expect(h.root.querySelectorAll('.kl-message-row')).toHaveLength(2);
  expect(h.root.querySelectorAll('.kl-chat-message-author-name')).toHaveLength(0);
  expect(h.root.querySelectorAll('.kl-chat-message-administrator')).toHaveLength(0);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it('opens the actual incoming and outgoing author profiles and restores their button focus without changing the draft',async()=>{
  const h=await setup(72385,202);
  vi.spyOn(h.presence,'hasCompatiblePeer').mockReturnValue(true);
  const request=vi.spyOn(h.presence,'request').mockReturnValue(true);
  const input=h.root.querySelector<HTMLTextAreaElement>('.kl-composer-input')!;
  input.value='A saved answer'; input.dispatchEvent(new Event('input',{bubbles:true}));
  await vi.waitFor(async()=>expect((await h.service.getConversation(202))?.draft).toBe('A saved answer'));
  const profile=h.root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!;

  for(const [direction,member]of [['incoming',202],['outgoing',72385]] as const){
    const author=h.root.querySelector<HTMLButtonElement>(`.kl-message-row[data-direction="${direction}"] .kl-chat-message-author`)!;
    expect(author.tagName).toBe('BUTTON');expect(author.type).toBe('button');
    author.focus();author.click();
    await vi.waitFor(()=>expect(profile.querySelector<HTMLElement>('.kl-addon-profile-body')?.dataset.member).toBe(String(member)));
    expect(profile.open).toBe(true);expect(input.value).toBe('A saved answer');
    profile.querySelector<HTMLButtonElement>('[aria-label="Close KikiLink profile"]')!.click();
    await vi.waitFor(()=>expect(profile.open).toBe(false));
    expect(h.root.activeElement).toBe(author);
    expect((await h.service.getConversation(202))?.draft).toBe('A saved answer');
  }
  expect(request).toHaveBeenCalledWith(202,true,true);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});

it('ignores an author control retained after its conversation or account changes',async()=>{
  const h=await setup(72385,202);
  const oldAuthor=h.root.querySelector<HTMLButtonElement>('.kl-message-row[data-direction="incoming"] .kl-chat-message-author')!;
  const profile=h.root.querySelector<HTMLDialogElement>('.kl-addon-profile-dialog')!;
  await h.view.openChat(303,'Kiki');
  expect(oldAuthor.isConnected).toBe(false);oldAuthor.click();expect(profile.open).toBe(false);

  await h.service.capture({direction:'outgoing',peerNumber:303,peerName:'Kiki',content:'Another message',sentAt:Date.now(),includeRoom:false},false);
  await h.view.openChat(303,'Kiki');
  const ownAuthor=h.root.querySelector<HTMLButtonElement>('.kl-message-row[data-direction="outgoing"] .kl-chat-message-author')!;
  vi.spyOn(h.adapter,'getOwnMemberNumber').mockReturnValue(404);
  ownAuthor.click();expect(profile.open).toBe(false);
  expect(h.adapter.sendBeep).not.toHaveBeenCalled();
});
