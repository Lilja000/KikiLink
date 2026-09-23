import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
// Counts production client calls in an isolated DOM runtime. This does not measure browser wire bytes, rendering, or real BC.
const root=resolve(import.meta.dirname,'..'), baseline=process.env.KIKILINK_NETWORK_BASELINE;
if(!baseline) throw new Error('Set KIKILINK_NETWORK_BASELINE to the preserved 0.30.0 source checkout.');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function run(source,label,newFeatures) {
  const imports=[['CloudClient','src/cloud/client.ts'],['LinkChatView','src/modules/link-chat/view.ts'],['MemoryKeyValueStorage,SettingsStore','src/core/settings.ts'],['ChatService','src/modules/link-chat/chat-service.ts'],['MemoryChatRepository','src/storage/memory-chat-repository.ts']].map(([names,path])=>`import {${names}} from ${JSON.stringify(resolve(source,path))};`).join('\n');
  const entry=imports+`
  window.runFixture=async()=>{
    window.Player={MemberNumber:101,Name:'Fixture',FriendList:[],FriendNames:new Map(),ExtensionSettings:{},BlackList:[],GhostList:[]};
    window.CurrentScreen='ChatSearch';window.ActivityFemale3DCG=[];window.AssetGroup=[];
    const adapter={getOwnMemberNumber:()=>101,getOwnName:()=> 'Fixture',getMemberName:n=>'Member '+n,getMemberNickname:()=>undefined,
      ownFriends:()=>[],subscribeFriends:()=>()=>{},getKnownContacts:()=>[],getRoomCharacters:()=>[],getOnlineFriends:()=>[],getPlayerRelationships:()=>[],
      getCurrentRoomName:()=>undefined,isInChatRoom:()=>false,isReady:()=>true,canSendBeep:()=>true,sendBeep:()=>{},refreshOnlineFriends:()=>{},sendKikiLinkProtocol:()=>{},broadcastKikiLinkProtocol:()=>{}};
    const storage=new MemoryKeyValueStorage(),settings=new SettingsStore(storage),chat=new ChatService(new MemoryChatRepository(),settings);
    const client=new CloudClient({origin:'https://cloud.example.test',memberNumber:101,getMemberNumber:()=>101,isBlocked:()=>false,sendProof:()=>{},fetchImpl:window.fixtureFetch,verificationDelays:[0],deviceStore:{load:async()=>undefined,save:async()=>{},pause:async()=>{}}});
    const view=new LinkChatView(adapter,chat,settings,'0.30.0');
    await client.connect();view.attachCloud(client,storage);view.mount();await view.open();
    return {view,client,settings};
  };`;
  const built=await build({stdin:{contents:entry,resolveDir:source},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',nodePaths:[resolve(root,'node_modules')],loader:{'.webp':'dataurl','.png':'dataurl','.svg':'dataurl'},define:{__KIKILINK_DISTRIBUTION__:'"fusam"',__KIKILINK_DEV_TEST__:'true'},logLevel:'silent'});
  const win=new Window({url:'https://bondageprojects.elementfx.com/R131/',settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true}});
  const requests=[],errors=[],streams=new Set();let phase='login',peak=0,runtime;
  win.structuredClone=structuredClone;win.TextEncoder=TextEncoder;win.TextDecoder=TextDecoder;
  win.requestAnimationFrame=fn=>win.setTimeout(()=>fn(win.performance.now()),16);win.cancelAnimationFrame=id=>win.clearTimeout(id);
  win.console.error=(...args)=>errors.push(args.map(String).join(' '));win.console.warn=()=>{};win.console.info=()=>{};
  win.fixtureFetch=async(input,init={})=>{
    const path=new URL(String(input)).pathname, method=init.method??'GET';requests.push({phase,method,path});
    const json=value=>new win.Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
    if(path==='/v1/auth/challenges')return json({challengeId:crypto.randomUUID(),proof:'p'.repeat(43),exchange:'e'.repeat(43),verifierMember:909,expiresAt:Date.now()+180000});
    if(path==='/v1/auth/exchange')return json({memberNumber:101,token:'t'.repeat(43),expiresAt:Date.now()+3600000});
    if(path==='/v1/me')return json({memberNumber:101,moderator:false,features:{community:newFeatures,preferences:newFeatures,directMessages:newFeatures,readCursors:newFeatures,fullProfile:true,groupInbox:true,groupLive:true,feedSearch:true}});
    if(path==='/v1/events'){
      let controller; const stream=new ReadableStream({start(c){controller=c;streams.add(c);peak=Math.max(peak,streams.size);c.enqueue(new TextEncoder().encode('event: ready\ndata: {}\n\n'));},cancel(){streams.delete(controller);}});
      init.signal?.addEventListener('abort',()=>{if(streams.delete(controller))try{controller.close()}catch{}},{once:true});
      return new win.Response(stream,{headers:{'content-type':'text/event-stream'}});
    }
    if(path==='/v1/presence')return new win.Response(null,{status:204});
    if(path.startsWith('/v1/profiles/'))return new win.Response(JSON.stringify({error:'not_found'}),{status:404,headers:{'content-type':'application/json'}});
    if(path==='/v1/capabilities/me')return json({friendRequests:true,directMessages:false});
    if(path==='/v1/feed/unread')return json({unread:0,latest:0,cursor:0});
    if(path==='/v1/mailbox')return json({items:[],unread:0,nextCursor:null});
    if(path==='/v1/relationships/confirm')return json({confirmed:[],accepted:[]});
    if(['/v1/blocks','/v1/groups','/v1/group-invitations','/v1/feed','/v1/relationships','/v1/relationships/known','/v1/read-cursors'].includes(path))return json({items:[],nextCursor:null});
    throw new Error('Unmodeled request '+method+' '+path);
  };
  win.fetch=win.fixtureFetch;
  const settle=async()=>{let count=-1;for(let i=0;i<12;i++){await wait(75);if(count===requests.length)return;count=requests.length;}throw new Error('Requests did not settle');};
  try{
    win.eval(built.outputFiles[0].text);runtime=await win.runFixture();await settle();
    const shadow=win.document.querySelector('#kikilink-root').shadowRoot;
    for(const [name,target] of [['home','home'],['custom','activities'],['chat','chat'],['players','roster'],['feed','cloud']]){
      phase='open-'+name;const button=shadow.querySelector('[data-target="'+target+'"]');assert.ok(button,target);button.click();await settle();
    }
    phase='feed-event';for(const controller of streams)controller.enqueue(new TextEncoder().encode('event: feed\ndata: {}\n\n'));await settle();
    phase='reconnect';const before=requests.filter(r=>r.path==='/v1/events').length;for(const controller of [...streams]){streams.delete(controller);controller.close();}
    for(let i=0;i<70&&requests.filter(r=>r.path==='/v1/events').length===before;i++)await wait(100);await settle();
    assert.ok(requests.filter(r=>r.path==='/v1/events').length>before,'Expected a bounded reconnect');
    phase='idle-3s';await wait(3000);assert.equal(requests.filter(r=>r.phase===phase).length,0,'Unexpected polling in the measured idle window');
    assert.ok(peak<=1,'Multiple simultaneous SSE streams');assert.deepEqual(errors,[]);
    const phases=Object.fromEntries(['login','open-home','open-custom','open-chat','open-players','open-feed','feed-event','reconnect','idle-3s'].map(p=>{const rows=requests.filter(r=>r.phase===p);return[p,{requests:rows.length,http:rows.filter(r=>r.path!=='/v1/events').length,sseOpens:rows.filter(r=>r.path==='/v1/events').length,byRoute:Object.fromEntries([...new Set(rows.map(r=>r.method+' '+r.path))].map(key=>[key,rows.filter(r=>r.method+' '+r.path===key).length]))}];}));
    return {label,features:newFeatures?'community enabled; offline Direct opt-out':'stable 0.30.0',phases,totalRequests:requests.length,peakConcurrentSSE:peak,trace:requests};
  } finally{runtime?.view.destroy();runtime?.client.destroy();await win.happyDOM.abort();await win.happyDOM.close();}
}
const result={measuredAt:new Date().toISOString(),method:'Production source modules; esbuild + Happy DOM; synthetic HTTP responses and SSE, empty feed/groups, one synthetic account, 75ms quiescence, three-second idle sample. No rendering/network-wire/Android claim.',baseline:await run(resolve(baseline),'preserved stable source',false),development:await run(root,'social/profile development',true)};
await mkdir(resolve(root,'.local-dev/evidence'),{recursive:true});await writeFile(resolve(root,'.local-dev/evidence/network-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({baseline:result.baseline.phases,development:result.development.phases,peakSSE:[result.baseline.peakConcurrentSSE,result.development.peakConcurrentSSE]},null,2));
