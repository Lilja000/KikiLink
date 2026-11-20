import { createMentionsFixture } from './mentions-fixture.js';
import { createNotificationsFixture } from './notifications-fixture.js';
import { GroupChatService } from '../../src/modules/link-chat/group-chat-service.ts';
import { CloudClient } from '../../src/cloud/client.ts';
import { LinkChatView } from '../../src/modules/link-chat/view.ts';
import { MemoryKeyValueStorage, SettingsStore } from '../../src/core/settings.ts';
import { AccountKeyValueStorage, AccountDataStorage, AccountSyncedChatRepository, accountChatDatabaseName } from '../../src/storage/account-data-storage.ts';
import { IndexedDbChatRepository } from '../../src/storage/indexeddb-chat-repository.ts';
import { MemoryChatRepository } from '../../src/storage/memory-chat-repository.ts';
import { ChatService } from '../../src/modules/link-chat/chat-service.ts';
import { LinkPresenceService } from '../../src/modules/link-presence/link-presence-service.ts';
import { EventBus } from '../../src/core/event-bus.ts';
import { LinkRosterService } from '../../src/modules/link-roster/link-roster-service.ts';
import { PeopleRepository } from '../../src/storage/people-repository.ts';
import emblem from '../../design/branding/kikilink-emblem.webp';
import catalog from '../../cloud/shared/preferences-catalog.json';
import feedReactions from '../../cloud/shared/feed-reactions.json';
import packageInfo from '../../package.json';
import { createFeedFixture } from './feed-fixture.js';
import { createAudioFixture } from './audio-fixture.js';
import { createDirectHistoryFixture } from './direct-history-fixture.js';
import { createRoomFixture } from './room-fixture.js';
import { DeviceGalleryStore } from '../../src/storage/device-gallery-store.ts';
import { RemoteImageLoader } from '../../src/modules/link-chat/remote-image-loader.ts';
import { createPopulatedCloudFixture } from './populated-cloud-fixture.js';
import { createPopulatedChatFixture } from './populated-chat-fixture.js';
const params = new URLSearchParams(location.search), now = Date.now();
const isFeedPreview = document.documentElement.dataset.feedPreview === 'true';
if (isFeedPreview) for (const [key, value] of Object.entries({ page: 'feed', persist: '1', creator: '1' })) if (!params.has(key)) params.set(key, value);
const populated = params.get('populated') === '1' ? createPopulatedCloudFixture(now) : undefined;
const ownMember = populated ? 72385 : params.get('musicGuest') === '1' ? 202 : params.get('creator') === '1' ? 72385 : 101;
const fixtureOrigin = 'https://visual.example.test';
const fixtureVersion = packageInfo.version;
const people = [{id:ownMember,name:'Kiki'},{id:202,name:'Yacht Captain - BOT'},{id:303,name:'Mina'},{id:404,name:'Robin'},{id:126578,name:'Member 126578'}];
const room = {name:"Snowy's comfy home",description:'A quiet place for conversation. A long room description stays readable without moving the room actions.',language:'EN',creator:'Kiki',memberCount:1,memberLimit:20,canJoin:true,locked:true,privateRoom:false,mapType:'Never',friends:[]};
const rooms=[room,
 {...room,name:'Velvet District',creator:'Velvet District BOT',description:'Welcome to the evening lounge.',locked:false,mapType:'Always',friends:[{memberNumber:202,memberName:'Yacht Captain - BOT'}]},
 {...room,name:'A room with a very long name that still leaves the count and favourite in place',language:'RU',creator:'Mina',memberCount:8,memberLimit:20,canJoin:false,friends:[{memberNumber:303,memberName:'Mina'}]},
 {...room,name:'Full room',creator:'A room creator with a much longer display name',memberCount:20,memberLimit:20,canJoin:false,locked:false,friends:[{memberNumber:202,memberName:'Yacht Captain - BOT'},{memberNumber:404,memberName:'Robin'}]},
 {...room,name:'No friends here',creator:'Robin',locked:false}];
const friends = [202], listeners = new Set(), bus = new EventBus();
window.Player = {MemberNumber:ownMember,Name:'Kiki',Nickname:'Kiki',FriendList:friends,FriendNames:new Map(people.map(p=>[p.id,p.name])),ExtensionSettings:{},BlackList:[],GhostList:[]};
window.ChatRoomData = {Name:"Snowy's comfy home",Space:'MainHall',Visibility:['All'],Admin:[ownMember]};
window.ChatRoomCharacter = people.map(p=>({MemberNumber:p.id,Name:p.name,Nickname:p.name}));
window.CurrentScreen='ChatRoom'; window.ActivityFemale3DCG=[]; window.AssetGroup=[];
const fixtureAccount=params.has('chatImport')?new AccountDataStorage(ownMember,localStorage):undefined;
const ownStorage=fixtureAccount??(params.get('accountStorage')==='1'?new AccountKeyValueStorage(ownMember,localStorage):params.get('persist')==='1'?{
 getItem:key=>localStorage.getItem(`kikilink-visual:${key}`),
 setItem:(key,value)=>localStorage.setItem(`kikilink-visual:${key}`,value),
 removeItem:key=>localStorage.removeItem(`kikilink-visual:${key}`),
}:new MemoryKeyValueStorage()), settings=new SettingsStore(ownStorage);
const populatedChats = populated ? createPopulatedChatFixture({own:ownMember,now,origin:fixtureOrigin,storage:ownStorage}) : undefined;
settings.update(d=>{d.ui.density=params.get('density')||d.ui.density; d.ui.homeLayout=params.get('home')||'showcase'; d.linkPresence.status='idle'; d.linkPresence.bio='Tea, quiet evenings, and a little mischief.'; d.linkPresence.avatarFrame='blossom'; d.linkPresence.avatarDecoration={mode:'preset',preset:'blossom',primary:'#d71932',secondary:'#d8b65d',angle:135};});
let presence;
const adapter={
 getOwnMemberNumber:()=>ownMember,getOwnName:()=> 'Kiki',getMemberName:n=>people.find(p=>p.id===n)?.name||`Member ${n}`,getMemberNickname:n=>people.find(p=>p.id===n)?.name,
 ownFriends:()=>[...friends],isKnownFriend:n=>friends.includes(n),subscribeFriends:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},setNativeFriend:(n,v)=>{if(v&&!friends.includes(n))friends.push(n);if(!v)friends.splice(friends.indexOf(n),1);for(const fn of listeners)fn([...friends])},
 getKnownContacts:()=>people.slice(1).map(p=>({memberNumber:p.id,memberName:p.name,inRoom:true,online:true})),
 getRoomCharacters:()=>people.filter(p=>p.id!==126578).map(p=>({memberNumber:p.id,memberName:p.name,isFriend:friends.includes(p.id)})),getOnlineFriends:()=>[{memberNumber:202,memberName:'Yacht Captain - BOT',roomName:"Snowy's comfy home"}],getOnlineFriendsSnapshot:()=>({friends:[],receivedAt:Date.now()}),
 getCurrentLobbyRoom:()=>room,getRoomSearchSpace:()=> 'X',searchRooms:async()=>rooms,
 getPlayerRelationships:n=>friends.includes(n)?['lover','whitelist']:[],getCurrentRoomName:()=>"Snowy's comfy home",isMemberInCurrentRoom:n=>n!==126578&&people.some(p=>p.id===n),isInChatRoom:()=>true,isReady:()=>true,canSendBeep:()=>true,
 refreshOnlineFriends:()=>true,refreshRoomList:()=>true,canSendRoomEmote:()=>true,canManageRoom:()=>true,canEditRoom:()=>true,
 sendBeep:(peer,content,includeRoom)=>({direction:'outgoing',peerNumber:peer,peerName:adapter.getMemberName(peer),content,sentAt:Date.now(),includeRoom}),
 sendKikiLinkProtocol:(peer,text)=>{const p=JSON.parse(text);if(p.t==='pq'&&peer!==126578)queueMicrotask(()=>bus.emit('bc:protocol',{senderNumber:peer,channel:'beep',payload:JSON.stringify({t:'ps',i:p.i,s:peer===202?'online':'idle',m:'Happy to chat',f:'rose',c:'midnight',j:{mode:'preset',preset:'rose',primary:'#9aade2',secondary:'#dcbed2',angle:135},k:['Tea lover','Quiet rooms'],u:Date.now(),v:fixtureVersion,g:3})}));},
 broadcastKikiLinkProtocol:()=>true,startWhisper:()=>{},openProfile:()=>{},setNativeFriendsVisible:()=>{},getNativeFriendSnapshot:()=>({receivedAt:now}),getNativeRecentBeeps:()=>[],sendRoomEmote:()=>{},getCurrentRoomData:()=>window.ChatRoomData,
};
if(params.has('profileLocation'))adapter.getRoomAdminSnapshot=()=>({roomName:window.ChatRoomData.Name,settings:{visibility:window.ChatRoomData.Visibility,space:window.ChatRoomData.Space}});
const profile=(n)=>({memberNumber:n,displayName:adapter.getMemberName(n),bio:n===ownMember?'Tea, quiet evenings, and a little mischief.':'A quiet corner and good company.',statusMessage:n===ownMember?'KikiLink Creator 🌸':'Happy to chat',avatarFrame:n===ownMember?'blossom':'moon',avatarDecoration:{mode:'preset',preset:n===ownMember?'blossom':'moon',primary:'#ab89cb',secondary:'#d8b65d',angle:135},publicTags:['Tea lover','Quiet rooms'],profileStyle:'midnight',avatarId:'00000000-0000-4000-8000-000000000001',bannerId:null,revision:1,visible:true,updatedAt:now});
const profiles=new Map(people.map(p=>[p.id,profile(p.id)]));
if(populated)for(const [member,current] of profiles){
 const recorded=populated.profiles(member);
 if(recorded)Object.assign(current,{languages:recorded.languages,utcOffsetMinutes:recorded.utcOffsetMinutes,joinedAt:recorded.joinedAt,activityVisibility:recorded.activityVisibility});
}
if(params.get('usernames')==='1')for(const [n,p]of profiles){p.username=n===ownMember?null:`member_${n}`;if(n===ownMember){p.usernameRevision=0;p.usernameChangeAllowedAt=0;}}
if(params.get('mentions')==='1')profiles.get(202).username='renamed';
if(params.has('legacyBadge'))for(const [n,p]of profiles){p.legacyBadge=n===202;p.legacyEligible=n===ownMember&&params.get('legacyBadge')==='eligible';p.legacyCohortReady=params.get('legacyBadge')!=='pending';p.showLegacyBadge=false;}
const relations=new Map([[202,{state:'accepted',canMessage:true}],[303,{state:'sent',canMessage:false}],[404,{state:'received',canMessage:false}]].map(([n,r])=>[n,{memberNumber:n,supported:true,directMessages:true,revision:1,updatedAt:now,nativeSyncRequired:false,...r}]));
let preferences={mode:'score',ratings:Object.fromEntries(catalog.items.slice(0,8).map(i=>[i.id,'love'])),revision:1,catalogVersion:catalog.version};
let mail=[{id:3,actor:404,kind:'friend_request',targetType:'profile',targetId:'404',count:1,createdAt:now,updatedAt:now,read:false,pending:true},{id:2,actor:202,kind:'comment',targetType:'comment',targetId:'1',postId:2,count:1,createdAt:now-50000,updatedAt:now-50000,read:false,pending:false}];
const feedFixture=createFeedFixture({profile,now,friends,params,ownMember});
const audioFixture=params.get('audio')==='1'?createAudioFixture({now}):undefined;
if(audioFixture&&params.has('audioState'))audioFixture.setMode(params.get('audioState'));
const historyFixture=params.get('directHistory')==='1'||params.has('cloudHistoryArchive')?createDirectHistoryFixture(ownMember,now,params.has('cloudHistoryArchive')?245:145):undefined;
const mentionFixture=params.get('mentions')==='1'?createMentionsFixture({own:ownMember,now,history:historyFixture,feed:feedFixture,mail,navigation:params.get('messageNavigation')==='1'}):undefined;
const notificationFixture=params.get('notifications')==='1'?createNotificationsFixture({own:ownMember,now,mail}):undefined;
const counters=[]; let mediaBlob;
const messageReactions = new Map();
const uploadedMedia = new Map();
const fixtureMediaIds = new Set(['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002']);
if(params.has('chatAttachments')||params.has('chatFiles'))fixtureMediaIds.add('20000000-0000-4000-8000-000000000001');
const fetchImpl=async (url,init={})=>{const u=new URL(String(url)),p=u.pathname,m=init.method||'GET',body=typeof init.body==='string'?JSON.parse(init.body):{}; counters.push({method:m,path:p,...(p==='/v1/read-cursors'&&m==='PUT'?{body}:{})});
 const json=v=>Response.json(v),empty=()=>json({items:[],nextCursor:null});
 const populatedResponse=populated?.request(u,m,body) ?? populatedChats?.request(u,init,body);if(populatedResponse)return populatedResponse;
 if(params.has('accountSettings')&&(params.has('profileDetails')&&p==='/v1/events'||p==='/v1/auth/exchange'||p.startsWith('/v1/auth/logout')||p.startsWith('/v1/account/sessions')||p==='/v1/me'||p.startsWith('/v1/profiles/')||p.startsWith('/v1/preferences/')||p==='/v1/privacy/me'||params.has('groupMigration')&&(p.startsWith('/v1/groups')||p.startsWith('/v1/group-')||p.startsWith('/v1/conversations/'))||params.has('directRetention')&&p.startsWith('/v1/direct/')||params.has('musicSessions')&&(p.startsWith('/v1/music-sessions')||p.startsWith('/v1/audio'))||params.has('matching')&&p.startsWith('/v1/matching')||params.has('workshop')&&(p.startsWith('/v1/workshop')||p.startsWith('/v1/media/')||p.startsWith('/v1/spaces'))||params.has('profileActivity')&&(p.startsWith('/v1/feed')||p.startsWith('/v1/calendar')||p.startsWith('/v1/albums')||p.startsWith('/v1/relationships')||p.startsWith('/v1/capabilities'))||params.has('profileLocation')&&(p==='/v1/presence'||p==='/v1/profile-location')||params.has('profileDiscovery')&&(p==='/v1/people'||p.startsWith('/v1/usernames/'))||p.startsWith('/v1/blocks')||params.has('profileCommunities')&&(p.startsWith('/v1/communities')||p==='/v1/community-directory')))return fetch('/fixture-account'+p+u.search,{method:m,signal:init.signal,headers:{...init.headers,...(params.has('musicSessions')?{'x-fixture-member':String(ownMember)}:{}),...(m==='GET'?{}:{'content-type':'application/json'})},...(m==='GET'?{}:{body:JSON.stringify(body)})});
 if(params.has('platformModeration')&&p.startsWith('/v1/feed'))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 if(params.has('profileRead')&&p.startsWith('/v1/preferences/'))return fetch('/fixture-communities'+p,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 if(params.has('albums')&&(p.startsWith('/v1/albums')||p.startsWith('/v1/album-images/')))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':init.body instanceof Blob?init.body.type:'application/json'},body:init.body instanceof Blob?init.body:JSON.stringify(body)})});
 if(params.has('channelMessaging')&&(params.has('events')&&(p.startsWith('/v1/relationships')||p==='/v1/feed/unread')||p.startsWith('/v1/me/')||p==='/v1/me'||p.startsWith('/v1/media/')||p.startsWith('/v1/audio')||p.startsWith('/v1/usernames')||p.startsWith('/v1/profiles/')||p.startsWith('/v1/mailbox')))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 if(params.has('spaces')&&p.startsWith('/v1/spaces'))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 if(params.has('events')&&(p.startsWith('/v1/calendar')||p==='/v1/reports'))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 if(params.has('communities')&&(p.startsWith('/v1/communities')||p==='/v1/community-directory'||p==='/v1/reports'||p.startsWith('/v1/moderation/')))return fetch('/fixture-communities'+p+u.search,{method:m,...(m==='GET'?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})});
 const notificationResponse=notificationFixture?.request(u,init,body);if(notificationResponse)return notificationResponse;
 const mentionResponse=mentionFixture?.request(u,init);if(mentionResponse)return mentionResponse;
 const audioResponse=await audioFixture?.request(u,init,body);if(audioResponse)return audioResponse;
 const historyResponse=await historyFixture?.request(u,init);if(historyResponse)return historyResponse;
 if(params.get('reactions')==='1'&&p==='/v1/direct/reactions/query')return json({items:body.ids.map(messageId=>({messageId,available:true,...(messageReactions.get(messageId)||{revision:0,mine:null,counts:[]})}))});
 if(params.get('reactions')==='1'&&p.endsWith('/reaction')&&m==='PUT'){const id=p.split('/').at(-2),value={available:true,revision:body.revision+1,mine:body.reaction,counts:body.reaction?[{reaction:body.reaction,count:1}]:[]};messageReactions.set(id,value);return json(value);}
 if(p.startsWith('/v1/audio'))return Response.json({error:'audio_unavailable'},{status:404});
 if(p==='/v1/auth/challenges')return json({challengeId:crypto.randomUUID(),proof:'p'.repeat(43),exchange:'e'.repeat(43),verifierMember:909,expiresAt:Date.now()+180000});
 if(p==='/v1/auth/exchange')return json({memberNumber:ownMember,token:'t'.repeat(43),expiresAt:now+3600000});
 if(p==='/v1/me')return json({memberNumber:ownMember,moderator:true,...(populated?{expiresAt:now+3600000}:{}),...(params.has('cloudHistoryArchive')?{directRecovery:{generation:'a'.repeat(32),restored:false}}:{}),features:{communities:params.has('communities'),legacyBadge:params.has('legacyBadge'),community:true,mentions:!!mentionFixture,usernames:params.get('usernames')==='1',directHistory:!!historyFixture,messageAudio:params.get('messageAudio')==='1',directMessageMedia:params.get('directMedia')==='1',messageReactions:params.get('reactions')==='1',directMessages:true,readCursors:true,preferences:true,fullProfile:true,profileGradientAngle:true,reportReasons:true,groupLive:true,groupInbox:true,feedSearch:true,feedPins:true,feedFeatured:true,reactionDetails:true,reactions:(params.get('legacy')==='1'?feedReactions.slice(0,7):feedReactions).map(item=>item.id),...(params.get('legacy')==='1'?{}:{feedBookmarks:true,feedReplies:true,feedFilters:true,feedFollowing:true,feedPollClose:true,feedPolls:true,feedWatch:true,feedHide:true,feedSpoilers:true}),...populated?.features}});
 if(p==='/v1/events')return new Response(new ReadableStream({start(c){const write=event=>{try{c.enqueue(new TextEncoder().encode(`event: ${event}\ndata: {}\n\n`))}catch{}};write('ready');const release=feedFixture.subscribe(()=>write('feed'));const releaseNotifications=notificationFixture?.subscribe(write);const heartbeat=setInterval(()=>{try{c.enqueue(new TextEncoder().encode(': heartbeat\n\n'))}catch{}},25000);init.signal?.addEventListener('abort',()=>{release();releaseNotifications?.();clearInterval(heartbeat);try{c.close()}catch{}})}}),{headers:{'Content-Type':'text/event-stream'}});
 if(p==='/v1/presence')return new Response(null,{status:204});
 if(p==='/v1/capabilities/me')return json({friendRequests:true,directMessages:true});
 if(p==='/v1/relationships/known')return json({items:body.members.map(n=>relations.get(n)||{memberNumber:n,supported:true,directMessages:true,state:'none',canMessage:false,revision:0,updatedAt:0,nativeSyncRequired:false})});
 if(p==='/v1/relationships/confirm')return json({confirmed:body.members,accepted:[]});
 if(p==='/v1/relationships')return json({items:[...relations.values()],nextCursor:null});
 if(p.startsWith('/v1/relationships/')){const n=Number(p.split('/')[3]),r=relations.get(n)||{memberNumber:n,supported:true,directMessages:true,state:'none',canMessage:false,revision:0,updatedAt:now,nativeSyncRequired:false};if(m==='POST'){r.state=p.endsWith('accept')?'accepted':p.endsWith('decline')?'declined':p.endsWith('cancel')?'cancelled':'sent';relations.set(n,r);}return json(r);}
 if(p==='/v1/mailbox')return json({items:mail,unread:mail.filter(i=>!i.read).length,nextCursor:null});
 if(p==='/v1/mailbox/read'){mail=mail.map(i=>({...i,read:!body.id||i.id===body.id?true:i.read}));return json({});}
 if(p==='/v1/feed/unread')return json({unread:2,latest:2});
 if(p.startsWith('/v1/read-cursors'))return json({items:[],cursor:2});
 if(p==='/v1/preferences/me'){
  if(m==='GET'&&params.get('preferences')==='unavailable')return Response.json({error:'community_disabled'},{status:404});
  if(m==='PUT')preferences={...body,revision:preferences.revision+1,catalogVersion:catalog.version};
  if(m==='PATCH'){
   const ratings={...preferences.ratings};
   for(const [id,level]of Object.entries(body.updates||{})){if(level===null)delete ratings[id];else ratings[id]=level;}
   preferences={...preferences,mode:body.mode??preferences.mode,ratings,revision:preferences.revision+1};
  }
  return json(preferences);
 }
 if(p.startsWith('/v1/compatibility/'))return json({status:'available',count:8,score:88});
 if(p.startsWith('/v1/direct/')){if(m==='POST'&&p.endsWith('/messages'))return json({id:crypto.randomUUID(),sequence:10,state:'sent'});return json({items:[],cursor:0,nextCursor:null});}
 if(p.startsWith('/v1/usernames/resolve/')){const username=p.split('/').at(-1),candidate=[...profiles.values()].find(x=>x.username===username&&x.visible);return candidate?json({memberNumber:candidate.memberNumber,username}):Response.json({error:'not_found'},{status:404});}
 if(p.startsWith('/v1/profiles/')){const n=p.endsWith('/me')?ownMember:Number(p.split('/').at(-1));if(n===126578)return Response.json({error:'profile_not_found'},{status:404});if(m==='PUT'){
  const old=profiles.get(n);
  if(body.showLegacyBadge===true&&!old?.legacyEligible)return Response.json({error:'legacy_badge_not_eligible'},{status:403});
  if(body.showLegacyBadge!==undefined)body.legacyBadge=old?.legacyEligible===true&&body.showLegacyBadge===true;
  if(body.username==='taken')return Response.json({error:'username_unavailable'},{status:409});
  if(body.username!==undefined&&body.usernameRevision!==old?.usernameRevision)return Response.json({error:'username_changed'},{status:409});
  if(body.username!==undefined&&old?.usernameChangeAllowedAt>Date.now())return Response.json({error:'username_cooldown'},{status:409});
  profiles.set(n,{...old,...body,memberNumber:n,revision:body.revision+1,...(body.username!==undefined?{usernameRevision:(old?.usernameRevision||0)+1,usernameChangeAllowedAt:Date.now()+86400000}:{})});
 }return json(profiles.get(n)||profile(n));}
 if(['/v1/media/feed','/v1/media/avatar','/v1/media/banner'].includes(p)&&m==='POST'){
  if(!(init.body instanceof Blob)||init.body.size>5*1024*1024)return Response.json({error:'invalid_media'},{status:400});
  const id=crypto.randomUUID();uploadedMedia.set(id,init.body);
  // Keep the local photo demo bounded without ever uploading to a real server.
  while(uploadedMedia.size>16||[...uploadedMedia.values()].reduce((sum,blob)=>sum+blob.size,0)>32*1024*1024)uploadedMedia.delete(uploadedMedia.keys().next().value);
  return json({id,kind:p.split('/').at(-1),bytes:init.body.size,width:512,height:512});
 }
 if(p.startsWith('/v1/media/')){
  const id=p.split('/').at(-1),uploaded=uploadedMedia.get(id);
  // Real Cloud normalizes to WebP. This offline mock preserves the chosen
  // image bytes and supplies that API header; browsers detect the image format.
  if(uploaded)return new Response(uploaded,{headers:{'Content-Type':'image/webp'}});
  if(!fixtureMediaIds.has(id))return Response.json({error:'media_not_found'},{status:404});
  mediaBlob??=await (await fetch(emblem)).blob();return new Response(mediaBlob);
 }
 const feedResponse=await feedFixture.request(u,init,body);if(feedResponse)return feedResponse;
 if(p==='/v1/reports'&&m==='POST')return json({id:1});
 return empty();
};
const roomFixture=params.get('rooms')==='1'?createRoomFixture({adapter,people,ownMember,room,rooms}):undefined;
let device;
const client=new CloudClient({origin:fixtureOrigin,memberNumber:ownMember,getMemberNumber:()=>ownMember,isBlocked:()=>false,sendProof:()=>{},fetchImpl,...(audioFixture?{xhrFactory:audioFixture.xhrFactory}:{}),verificationDelays:[0],deviceStore:{load:async()=>device,save:async value=>{device=value},pause:async()=>{device='paused'}}});
if(params.get('directMedia')==='1')client.upload=async(path,blob,options={})=>{
 await new Promise((done,fail)=>{const timer=setTimeout(done,400);options.onProgress?.(42);options.signal?.addEventListener('abort',()=>{clearTimeout(timer);fail(new Error('cancelled'))},{once:true});});
 if(options.signal?.aborted)throw new Error('cancelled');options.onProgress?.(100);
 const response=await fetchImpl('https://visual.example.test'+path,{method:'POST',body:blob});return response.json();
};
presence=new LinkPresenceService(adapter,settings,bus,fixtureVersion);presence.start();
const chatAccount=fixtureAccount;
const chatPrimary=chatAccount?new IndexedDbChatRepository(accountChatDatabaseName(ownMember)):new MemoryChatRepository();
if(chatAccount)await chatAccount.attachChatRepository(chatPrimary);
const chatRepository=chatAccount?new AccountSyncedChatRepository(chatPrimary,chatAccount):chatPrimary;
const chat=new ChatService(chatRepository,settings,chatAccount?ownMember:undefined),roster=new LinkRosterService(adapter,new PeopleRepository(ownStorage),settings);
const galleryFixture=params.get('gallery')==='1'?{store:new DeviceGalleryStore(ownMember),requests:[],failRemote:false}:undefined;
const galleryLoader=galleryFixture?new RemoteImageLoader({fetchImpl:async(url,init)=>{
 galleryFixture.requests.push(String(url)); if(init?.signal?.aborted)throw new DOMException('Cancelled','AbortError');
 if(galleryFixture.failRemote)return new Response(null,{status:503});
 const response=new Response(await (await fetch(emblem)).blob(),{headers:{'content-type':'image/webp'}});Object.defineProperty(response,'url',{value:String(url)});return response;
}}):undefined;
const view=new LinkChatView(adapter,chat,settings,fixtureVersion,undefined,roster,presence,undefined,undefined,undefined,galleryFixture?.store,undefined,galleryLoader);
let legacyGroupFixture;
if(params.has('groupMigration')){
 legacyGroupFixture=new GroupChatService({getOwnMemberNumber:()=>ownMember,getMemberName:adapter.getMemberName,sendKikiLinkProtocol:()=>true,isKnownFriend:()=>true,getPlayerRelationships:()=>[]},ownStorage,{now:()=>Number(params.get('groupClock'))||now,hasManagedPeer:()=>true,isPeerReachable:()=>true});
 if(!legacyGroupFixture.listGroups().length)await legacyGroupFixture.createManagedGroup([202,303],'Old tea room');
 view.attachGroupChatService(legacyGroupFixture);
}
if(!params.has('offlineWorkshop'))await client.connect();view.attachCloud(client,ownStorage);view.attachNavigationStorage(ownStorage);view.mount();view.setConnectionState(params.has('offlineWorkshop')?'idle':'ready',params.has('offlineWorkshop')?'Disconnected':'Connected');
const seedChat=!historyFixture&&(!chatAccount||!(await chatRepository.listConversations()).length);
if(seedChat)await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'Good evening! The tea is ready. 🌸',sentAt:now-86400000,includeRoom:false},false);
if(seedChat)await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'Would you like to join us?',sentAt:now-20000,includeRoom:false},false);
if(params.get('reactions')==='1')for(const direction of ['incoming','outgoing'])await chat.captureCloud({direction,peerNumber:202,peerName:'Reina',content:direction==='incoming'?'A little celebration for today.':'Yes! 🌸',sentAt:now-5000,includeRoom:false},{id:'reaction-'+direction,cloudId:crypto.randomUUID(),delivery:direction==='outgoing'?'read':undefined},false);
await populatedChats?.seedDirect(chat);
await view.open();
if(params.get('page')==='feed')document.querySelector('#kikilink-root').shadowRoot.querySelector('[data-target="cloud"]')?.click();
window.addEventListener('error',event=>{document.getElementById('fixture-state').textContent='ERROR: '+event.message});
document.getElementById('fixture-state').textContent=`Actual KikiLink UI · synthetic BC / Cloud data · ${innerWidth} × ${innerHeight}`;
document.getElementById('profile').onclick=async()=>{await view.openChat(202,'Reina');document.querySelector('#kikilink-root').shadowRoot.querySelector('.kl-chat-header > .kl-avatar').click()};
if(!isFeedPreview){const unknown=document.createElement('button');unknown.textContent='Unknown profile';unknown.id='unknown';unknown.onclick=async()=>{await view.openChat(126578,'Member 126578');document.querySelector('#kikilink-root').shadowRoot.querySelector('.kl-chat-header > .kl-avatar').click()};document.getElementById('fixture-tools').append(unknown);}
document.getElementById('density').value=settings.get().ui.density;document.getElementById('density').onchange=e=>settings.update(d=>{d.ui.density=e.target.value});
document.getElementById('incoming').onclick=async()=>{const msg=await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'A new message while you are reading.',sentAt:Date.now(),includeRoom:false},view.isActiveConversation(202));await view.onMessage(202,true,msg)};
document.getElementById('metrics').onclick=()=>{document.getElementById('metric-output').textContent=JSON.stringify(counters)};
document.getElementById('feed-incoming').onclick=()=>feedFixture.addIncoming();
document.getElementById('feed-event').onclick=()=>feedFixture.emit();

if(isFeedPreview){
 document.body.dataset.feedPreview='true';
 for(const id of ['profile','incoming','feed-event','metrics'])document.getElementById(id).hidden=true;
 const controls=document.getElementById('fixture-tools');
 const label=document.createElement('span');label.textContent=`Feed ${fixtureVersion} · тест`;controls.prepend(label);
 const density=document.getElementById('density');density.setAttribute('aria-label','Плотность интерфейса');
 for(const option of density.options){option.value=option.textContent;option.textContent=({'comfortable':'Обычный','compact':'Компактный','super-compact':'Очень компактный'})[option.value]||option.value;}
 document.getElementById('feed-incoming').textContent='Новый пост';
 document.getElementById('feed-incoming').title='Добавить тестовый пост в ленту';
 document.getElementById('fixture-state').textContent='Тестовые данные · черновик сохраняется на устройстве';
}
window.fixture={accountStorage:fixtureAccount,legacyGroups:legacyGroupFixture,notifications:notificationFixture,mentions:mentionFixture,view,settings,client,chat,history:historyFixture,roster,bus,presence,adapter,profiles,counters,feed:feedFixture,audio:audioFixture,rooms:roomFixture,gallery:galleryFixture,relationships:relations,people,friends,ownMember,version:fixtureVersion};
if(params.has('portableHydration')){const helpers=await import('./portable-hydration-fixture.js');const {exportDeviceData}=await import('../../src/storage/device-data-export.ts');const {readStoredZip}=await import('../../src/utils/read-stored-zip.ts');window.fixture.portableHydration={...helpers,exportDeviceData,readStoredZip,repository:chatPrimary};}
if(params.has('chatPortability')){const helpers=await import('./chat-field-portability-fixture.js');const {exportDeviceData}=await import('../../src/storage/device-data-export.ts');const {readStoredZip}=await import('../../src/utils/read-stored-zip.ts');window.fixture.chatPortability={...helpers,exportDeviceData,readStoredZip,repository:chatPrimary};}
if(params.has('galleryPortability')){window.fixture.galleryPortability=await import('./gallery-field-portability-fixture.js');}
if(params.has('musicPortability')){window.fixture.musicPortability=await import('./music-field-portability-fixture.js');}
if(params.has('soundFeedPortability')){window.fixture.soundFeedPortability=await import('./sound-feed-field-portability-fixture.js');}
if(params.has('settingsSourcePortability')){window.fixture.settingsSourcePortability=await import('./settings-source-portability-fixture.js');}
if(params.has('feedDraftPortability')){window.fixture.feedDraftPortability=await import('./feed-draft-field-portability-fixture.js');}
if(params.has('threadHistory')){window.fixture.threadHistory=await import('./thread-history-fixture.js');}
if(params.has('savedDeviceFiles')){window.fixture.savedDeviceFiles=await import('./saved-device-files-fixture.js');}
if(params.has('backupConsistency')){window.fixture.backupConsistency=await import('./device-backup-consistency-fixture.js');}
if(params.has('chatAttachments')){const {ChatAttachmentArchiveImporter}=await import('../../src/storage/chat-attachment-archive-import.ts');const {reviewDeviceArchive,chatFromDeviceArchive}=await import('../../src/storage/device-data-review.ts');window.fixture.chatAttachments={ChatAttachmentArchiveImporter,reviewDeviceArchive,chatFromDeviceArchive};}

if(params.has('galleryImport')){const {GalleryArchiveImporter}=await import('../../src/storage/gallery-archive-import.ts');const {reviewDeviceArchive,galleryFromDeviceArchive}=await import('../../src/storage/device-data-review.ts');const {DeviceGalleryStore}=await import('../../src/storage/device-gallery-store.ts');window.fixture.galleryImport={GalleryArchiveImporter,reviewDeviceArchive,galleryFromDeviceArchive,DeviceGalleryStore};}

if(params.has('musicImport')){const {MusicArchiveImporter}=await import('../../src/storage/music-archive-import.ts');const {reviewDeviceArchive,musicFromDeviceArchive}=await import('../../src/storage/device-data-review.ts');const {DeviceMusicStore}=await import('../../src/storage/device-music-store.ts');window.fixture.musicImport={MusicArchiveImporter,reviewDeviceArchive,musicFromDeviceArchive,DeviceMusicStore,ownStorage};}

if(params.has('soundImport')){const {SoundArchiveImporter}=await import('../../src/storage/sound-archive-import.ts');const {reviewDeviceArchive,soundsFromDeviceArchive}=await import('../../src/storage/device-data-review.ts');const {DeviceNotificationSoundStore}=await import('../../src/storage/device-notification-sound-store.ts');const {NotificationSoundService}=await import('../../src/modules/link-reactions/notification-sounds.ts');window.fixture.soundImport={SoundArchiveImporter,reviewDeviceArchive,soundsFromDeviceArchive,DeviceNotificationSoundStore,NotificationSoundService};}

if(params.has('feedImport')){const [{FeedArchiveImporter},{reviewDeviceArchive,feedFromDeviceArchive},{FeedDraftStore}]=await Promise.all([import('../../src/storage/feed-archive-import.ts'),import('../../src/storage/device-data-review.ts'),import('../../src/cloud/feed-drafts.ts')]);window.fixture.feedImport={FeedArchiveImporter,reviewDeviceArchive,feedFromDeviceArchive,FeedDraftStore};}

if(params.has('chatFiles')){const model=await import('../../src/storage/chat-file-model.ts');const {ChatFileArchiveImporter}=await import('../../src/storage/chat-file-archive-import.ts');const {reviewDeviceArchive,chatFilesFromDeviceArchive}=await import('../../src/storage/device-data-review.ts');const {exportDeviceData,exportValueEncoder}=await import('../../src/storage/device-data-export.ts');window.fixture.chatFiles={...model,ChatFileArchiveImporter,reviewDeviceArchive,chatFilesFromDeviceArchive,exportDeviceData,exportValueEncoder};}

if(params.has('chatFileBatch')){const {ChatFileBatchSaver}=await import('../../src/cloud/chat-file-batch.ts');const {ChatFileBatchSource}=await import('../../src/storage/chat-file-batch-source.ts');const {CloudError}=await import('../../src/cloud/client.ts');window.fixture.chatFileBatch={ChatFileBatchSaver,ChatFileBatchSource,CloudError};}

if(params.has('soundAssignments')){const {SoundAssignmentRestorer}=await import('../../src/storage/sound-assignment-restore.ts');const {DurableSoundAssignmentFiles}=await import('../../src/storage/sound-assignment-files.ts');const {SettingsStore,MemoryKeyValueStorage}=await import('../../src/core/settings.ts');window.fixture.soundAssignments={SoundAssignmentRestorer,DurableSoundAssignmentFiles,SettingsStore,MemoryKeyValueStorage,ownStorage};}
if(params.has('cloudHistoryArchive')){const {CloudHistoryArchive}=await import('../../src/cloud/history-archive.ts');const {CloudDirect}=await import('../../src/cloud/direct.ts');const {CloudError}=await import('../../src/cloud/client.ts');const {ChatArchiveImporter}=await import('../../src/storage/chat-archive-import.ts');const {parseChatImportSource,planChatImport}=await import('../../src/storage/chat-import-model.ts');window.fixture.cloudHistoryArchive={CloudHistoryArchive,CloudDirect,CloudError,ChatArchiveImporter,parseChatImportSource,planChatImport,ownStorage};}
if(params.has('restorePoints')){const model=await import('../../src/storage/device-restore-point-model.ts');const store=await import('../../src/storage/device-restore-point-store.ts');const session=await import('../../src/storage/device-restore-session.ts');const {exportDeviceData}=await import('../../src/storage/device-data-export.ts');const {reviewDeviceArchive}=await import('../../src/storage/device-data-review.ts');const {readStoredZip}=await import('../../src/utils/read-stored-zip.ts');const {runNativeRestorePointChecks}=await import('./restore-points-fixture.js');window.fixture.restorePoints={...model,...store,...session,exportDeviceData,reviewDeviceArchive,readStoredZip,runNativeRestorePointChecks,ownStorage};}

if(params.has('deviceSnapshot')){window.fixture.deviceSnapshot=await import('./device-snapshot-fixture.js');}

if(params.has('accountWrites')){window.fixture.accountWrites={SettingsStore,...(await import('../../src/storage/account-write-version.ts')),...(await import('../../src/storage/account-data-storage.ts'))};}
