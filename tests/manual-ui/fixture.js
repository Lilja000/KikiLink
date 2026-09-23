import { CloudClient } from '../../src/cloud/client.ts';
import { LinkChatView } from '../../src/modules/link-chat/view.ts';
import { MemoryKeyValueStorage, SettingsStore } from '../../src/core/settings.ts';
import { MemoryChatRepository } from '../../src/storage/memory-chat-repository.ts';
import { ChatService } from '../../src/modules/link-chat/chat-service.ts';
import { LinkPresenceService } from '../../src/modules/link-presence/link-presence-service.ts';
import { EventBus } from '../../src/core/event-bus.ts';
import { LinkRosterService } from '../../src/modules/link-roster/link-roster-service.ts';
import { PeopleRepository } from '../../src/storage/people-repository.ts';
import emblem from '../../design/branding/kikilink-emblem.webp';
import catalog from '../../cloud/shared/preferences-catalog.json';
const params = new URLSearchParams(location.search), now = Date.now();
const people = [{id:101,name:'Kiki'},{id:202,name:'Yacht Captain - BOT'},{id:303,name:'Mina'},{id:404,name:'Robin'},{id:126578,name:'Member 126578'}];
const room = {name:"Snowy's comfy home",description:'A quiet place for conversation. A long room description stays readable without moving the room actions.',language:'EN',creator:'Kiki',memberCount:1,memberLimit:20,canJoin:true,locked:true,privateRoom:false,mapType:'Never',friends:[]};
const rooms=[room,
 {...room,name:'Velvet District',creator:'Velvet District BOT',description:'Welcome to the evening lounge.',locked:false,mapType:'Always',friends:[{memberNumber:202,memberName:'Yacht Captain - BOT'}]},
 {...room,name:'A room with a very long name that still leaves the count and favourite in place',language:'RU',creator:'Mina',memberCount:8,memberLimit:20,canJoin:false,friends:[{memberNumber:303,memberName:'Mina'}]},
 {...room,name:'Full room',creator:'A room creator with a much longer display name',memberCount:20,memberLimit:20,canJoin:false,locked:false,friends:[{memberNumber:202,memberName:'Yacht Captain - BOT'},{memberNumber:404,memberName:'Robin'}]},
 {...room,name:'No friends here',creator:'Robin',locked:false}];
const friends = [202], listeners = new Set(), bus = new EventBus();
window.Player = {MemberNumber:101,Name:'Kiki',Nickname:'Kiki',FriendList:friends,FriendNames:new Map(people.map(p=>[p.id,p.name])),ExtensionSettings:{},BlackList:[],GhostList:[]};
window.ChatRoomData = {Name:"Snowy's comfy home",Space:'MainHall',Visibility:['All'],Admin:[101]};
window.ChatRoomCharacter = people.map(p=>({MemberNumber:p.id,Name:p.name,Nickname:p.name}));
window.CurrentScreen='ChatRoom'; window.ActivityFemale3DCG=[]; window.AssetGroup=[];
const ownStorage=new MemoryKeyValueStorage(), settings=new SettingsStore(ownStorage);
settings.update(d=>{d.ui.density=params.get('density')||'comfortable'; d.ui.homeLayout=params.get('home')||'showcase'; d.linkPresence.status='idle'; d.linkPresence.bio='Tea, quiet evenings, and a little mischief.'; d.linkPresence.avatarFrame='blossom'; d.linkPresence.avatarDecoration={mode:'preset',preset:'blossom',primary:'#d71932',secondary:'#d8b65d',angle:135};});
let presence;
const adapter={
 getOwnMemberNumber:()=>101,getOwnName:()=> 'Kiki',getMemberName:n=>people.find(p=>p.id===n)?.name||`Member ${n}`,getMemberNickname:n=>people.find(p=>p.id===n)?.name,
 ownFriends:()=>[...friends],isKnownFriend:n=>friends.includes(n),subscribeFriends:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},setNativeFriend:(n,v)=>{if(v&&!friends.includes(n))friends.push(n);if(!v)friends.splice(friends.indexOf(n),1);for(const fn of listeners)fn([...friends])},
 getKnownContacts:()=>people.slice(1).map(p=>({memberNumber:p.id,memberName:p.name,inRoom:true,online:true})),
 getRoomCharacters:()=>people.filter(p=>p.id!==126578).map(p=>({memberNumber:p.id,memberName:p.name,isFriend:friends.includes(p.id)})),getOnlineFriends:()=>[{memberNumber:202,memberName:'Yacht Captain - BOT',roomName:"Snowy's comfy home"}],getOnlineFriendsSnapshot:()=>({friends:[],receivedAt:Date.now()}),
 getCurrentLobbyRoom:()=>room,getRoomSearchSpace:()=> 'X',searchRooms:async()=>rooms,
 getPlayerRelationships:n=>friends.includes(n)?['friend','lover','whitelist']:[],getCurrentRoomName:()=>"Snowy's comfy home",isMemberInCurrentRoom:n=>n!==126578&&people.some(p=>p.id===n),isInChatRoom:()=>true,isReady:()=>true,canSendBeep:()=>true,
 refreshOnlineFriends:()=>true,refreshRoomList:()=>true,canSendRoomEmote:()=>true,canManageRoom:()=>true,canEditRoom:()=>true,
 sendBeep:(peer,content,includeRoom)=>({direction:'outgoing',peerNumber:peer,peerName:adapter.getMemberName(peer),content,sentAt:Date.now(),includeRoom}),
 sendKikiLinkProtocol:(peer,text)=>{const p=JSON.parse(text);if(p.t==='pq'&&peer!==126578)queueMicrotask(()=>bus.emit('bc:protocol',{senderNumber:peer,channel:'beep',payload:JSON.stringify({t:'ps',i:p.i,s:peer===202?'online':'idle',m:'Happy to chat',f:'rose',c:'midnight',j:{mode:'preset',preset:'rose',primary:'#9aade2',secondary:'#dcbed2',angle:135},k:['Tea lover','Quiet rooms'],u:Date.now(),v:'0.30.0',g:3})}));},
 broadcastKikiLinkProtocol:()=>true,startWhisper:()=>{},openProfile:()=>{},setNativeFriendsVisible:()=>{},getNativeFriendSnapshot:()=>({receivedAt:now}),getNativeRecentBeeps:()=>[],sendRoomEmote:()=>{},getCurrentRoomData:()=>window.ChatRoomData,
};
const profile=(n)=>({memberNumber:n,displayName:adapter.getMemberName(n),bio:n===101?'Tea, quiet evenings, and a little mischief.':'A quiet corner and good company.',statusMessage:n===101?'KikiLink Creator 🌸':'Happy to chat',avatarFrame:n===101?'blossom':'moon',avatarDecoration:{mode:'preset',preset:n===101?'blossom':'moon',primary:'#ab89cb',secondary:'#d8b65d',angle:135},publicTags:['Tea lover','Quiet rooms'],profileStyle:'midnight',avatarId:'00000000-0000-4000-8000-000000000001',bannerId:null,revision:1,visible:true,updatedAt:now});
const profiles=new Map(people.map(p=>[p.id,profile(p.id)]));
const relations=new Map([[202,{state:'accepted',canMessage:true}],[303,{state:'sent',canMessage:false}],[404,{state:'received',canMessage:false}]].map(([n,r])=>[n,{memberNumber:n,supported:true,directMessages:true,revision:1,updatedAt:now,nativeSyncRequired:false,...r}]));
let preferences={mode:'score',ratings:Object.fromEntries(catalog.items.slice(0,8).map(i=>[i.id,'love'])),revision:1,catalogVersion:catalog.version};
let mail=[{id:3,actor:404,kind:'friend_request',targetType:'profile',targetId:'404',count:1,createdAt:now,updatedAt:now,read:false,pending:true},{id:2,actor:202,kind:'comment',targetType:'comment',targetId:'1',postId:1,count:1,createdAt:now-50000,updatedAt:now-50000,read:false,pending:false}];
const posts=[{id:2,author:202,profile:profile(202),text:'A cosy corner for the evening. Who is joining us for tea?',revision:1,createdAt:now-3600000,updatedAt:now,mediaIds:[],reactions:{counts:[{reaction:'heart',count:3}],mine:null},commentCount:2},{id:1,author:303,profile:profile(303),text:'Small moments, familiar company. 🌸',revision:1,createdAt:now-86400000,updatedAt:now,mediaIds:[],reactions:{counts:[],mine:null},commentCount:0}];
const counters=[]; let mediaBlob;
const fetchImpl=async (url,init={})=>{const u=new URL(String(url)),p=u.pathname,m=init.method||'GET',body=typeof init.body==='string'?JSON.parse(init.body):{}; counters.push({method:m,path:p});
 const json=v=>Response.json(v),empty=()=>json({items:[],nextCursor:null});
 if(p==='/v1/auth/challenges')return json({challengeId:crypto.randomUUID(),proof:'p'.repeat(43),exchange:'e'.repeat(43),verifierMember:909,expiresAt:now+3600000});
 if(p==='/v1/auth/exchange')return json({memberNumber:101,token:'t'.repeat(43),expiresAt:now+3600000});
 if(p==='/v1/me')return json({memberNumber:101,moderator:true,features:{community:true,directMessages:true,readCursors:true,preferences:true,fullProfile:true,reportReasons:true,groupLive:true,groupInbox:true,feedSearch:true}});
 if(p==='/v1/events')return new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('event: ready\ndata: {}\n\n'));init.signal?.addEventListener('abort',()=>{try{c.close()}catch{}})}}),{headers:{'Content-Type':'text/event-stream'}});
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
 if(p.startsWith('/v1/profiles/')){const n=p.endsWith('/me')?101:Number(p.split('/').at(-1));if(n===126578)return Response.json({error:'profile_not_found'},{status:404});if(m==='PUT')profiles.set(n,{...profiles.get(n),...body,memberNumber:n,revision:body.revision+1});return json(profiles.get(n)||profile(n));}
 if(p.startsWith('/v1/media/')){mediaBlob??=await (await fetch(emblem)).blob();return new Response(mediaBlob);}
 if(p==='/v1/feed')return json({items:posts,nextCursor:null});
 if(/^\/v1\/feed\/\d+$/.test(p))return json(posts.find(post=>post.id===Number(p.split('/').at(-1))));
 if(p==='/v1/comments/1')return json({id:1,postId:1,author:202,profile:profile(202),text:'I will bring the tea!',revision:1,createdAt:now,updatedAt:now,reactions:{counts:[],mine:null}});
 if(p==='/v1/reports'&&m==='POST')return json({id:1});
 return empty();
};
let device;
const client=new CloudClient({origin:'https://visual.example.test',memberNumber:101,getMemberNumber:()=>101,isBlocked:()=>false,sendProof:()=>{},fetchImpl,verificationDelays:[0],deviceStore:{load:async()=>device,save:async value=>{device=value},pause:async()=>{device='paused'}}});
presence=new LinkPresenceService(adapter,settings,bus,'0.30.0');presence.start();
const chat=new ChatService(new MemoryChatRepository(),settings),roster=new LinkRosterService(adapter,new PeopleRepository(ownStorage),settings);
const view=new LinkChatView(adapter,chat,settings,'0.30.0',undefined,roster,presence);
await client.connect();view.attachCloud(client,ownStorage);view.mount();view.setConnectionState('ready','Connected');
await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'Good evening! The tea is ready. 🌸',sentAt:now-86400000,includeRoom:false},false);
await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'Would you like to join us?',sentAt:now-20000,includeRoom:false},false);
await view.open();
window.addEventListener('error',event=>{document.getElementById('fixture-state').textContent='ERROR: '+event.message});
document.getElementById('fixture-state').textContent=`Actual KikiLink UI · synthetic BC / Cloud data · ${innerWidth} × ${innerHeight}`;
document.getElementById('profile').onclick=async()=>{await view.openChat(202,'Reina');document.querySelector('#kikilink-root').shadowRoot.querySelector('.kl-chat-header > .kl-avatar').click()};
const unknown=document.createElement('button');unknown.textContent='Unknown profile';unknown.id='unknown';unknown.onclick=async()=>{await view.openChat(126578,'Member 126578');document.querySelector('#kikilink-root').shadowRoot.querySelector('.kl-chat-header > .kl-avatar').click()};document.getElementById('fixture-tools').append(unknown);
document.getElementById('density').value=settings.get().ui.density;document.getElementById('density').onchange=e=>settings.update(d=>{d.ui.density=e.target.value});
document.getElementById('incoming').onclick=async()=>{const msg=await chat.capture({direction:'incoming',peerNumber:202,peerName:'Reina',content:'A new message while you are reading.',sentAt:Date.now(),includeRoom:false},view.isActiveConversation(202));await view.onMessage(202,true,msg)};
document.getElementById('metrics').onclick=()=>{document.getElementById('metric-output').textContent=JSON.stringify(counters)};

window.fixture={view,settings,client,chat,roster,bus,presence,adapter,profiles,counters};
