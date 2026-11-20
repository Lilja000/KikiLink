import type {CloudClient} from '../../cloud/client';
import type {ThreadHistoryScope} from '../../cloud/thread-history-format';
import type {OpenThreadCopy} from '../../storage/thread-history-copy-store';
import {readThreadTimelineCopies,mergeThreadTimeline,type ThreadTimeline} from '../../storage/thread-history-timeline';
import {bindClockText} from '../../core/time-format';
import {element} from '../../utils/dom';

interface TimelineOptions {client:CloudClient;scope:ThreadHistoryScope;current:()=>boolean;live:()=>readonly unknown[];hiddenIds?:()=>readonly string[];blocked?:(member:number)=>boolean;focus?:HTMLElement;returned?:()=>void}
const CSS=`.kl-history-host[data-history-mode="saved"]>:not(.kl-history-timeline){display:none!important}.kl-history-timeline{display:flex;flex-direction:column;gap:10px;min-width:0;min-height:0;max-height:calc(100dvh - 140px);overflow:auto;padding:12px;box-sizing:border-box;overscroll-behavior:contain}.kl-history-timeline-head{position:sticky;top:-12px;z-index:1;background:var(--kl-bg);padding:8px 0}.kl-history-timeline h3,.kl-history-timeline p{margin:4px 0;overflow-wrap:anywhere}.kl-history-timeline .kl-cm-messages{flex:none;max-height:none;overflow:visible}.kl-history-timeline .kl-cm-message{max-width:96%}.kl-history-timeline audio,.kl-history-timeline img{max-width:100%}.kl-history-timeline .kl-history-source{display:block;color:var(--kl-muted);font-size:var(--kl-type-xs)}`;
/** Explicit, read-only combined mode inside the actual conversation surface. */
export class ThreadHistoryTimelinePanel {
 readonly element=element('section',{className:'kl-history-timeline',ariaLabel:'Combined conversation history'});
 #options:TimelineOptions|undefined;#parent:HTMLElement|undefined;#owner=0;#origin='';#copies:OpenThreadCopy[]=[];#page=0;#busy=false;#epoch=0;#controller:AbortController|undefined;#unsubscribe:(()=>void)|undefined;#observer:MutationObserver|undefined;#signature='';#urls=new Set<string>();#error='';
 constructor(readonly root:HTMLElement|ShadowRoot){}
 get active():boolean{return !!this.#options;}
 #valid():boolean {const o=this.#options;return !!o&&o.current()&&o.client.connected&&o.client.memberNumber===this.#owner&&o.client.origin===this.#origin;}
 #release():void{for(const a of this.element.querySelectorAll('audio')){a.pause();a.removeAttribute('src');a.load();}for(const u of this.#urls)URL.revokeObjectURL(u);this.#urls.clear();}
 close():void{const o=this.#options;this.#epoch++;this.#options=undefined;this.#controller?.abort();this.#controller=undefined;this.#busy=false;this.#copies=[];this.#signature='';this.#release();this.#unsubscribe?.();this.#unsubscribe=undefined;this.#observer?.disconnect();this.#observer=undefined;this.#parent?.removeAttribute('data-history-mode');this.#parent=undefined;this.element.remove();this.element.replaceChildren();if(o?.focus?.isConnected&&o.current())o.focus.focus({preventScroll:true});}
 open(parent:HTMLElement,options:TimelineOptions):void{
  this.close();this.#options={...options,scope:{...options.scope}};this.#owner=options.client.memberNumber;this.#origin=options.client.origin;this.#page=0;this.#error='';
  if(!this.#valid()){this.close();return;}this.mount(parent);
  this.#unsubscribe=options.client.subscribe(kind=>{if(['session','disconnected','groups','communities','blocks','relationships','media-invalidated'].includes(kind)||!this.#valid())this.close();});
  this.#observer=new MutationObserver(()=>{if(this.active&&(!this.#valid()||!this.element.isConnected))this.close();});this.#observer.observe(this.root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  this.element.tabIndex=-1;this.element.focus({preventScroll:true});void this.#load(true);
 }
 mount(parent:HTMLElement):void{if(!this.#valid()){this.close();return;}if(this.#parent!==parent)this.#parent?.removeAttribute('data-history-mode');this.#parent=parent;parent.classList.add('kl-history-host');parent.dataset.historyMode='saved';parent.append(this.element);}
 async #load(latest:boolean):Promise<void>{
  if(!this.#valid()||this.#busy)return;const o=this.#options!,epoch=++this.#epoch,controller=new AbortController();this.#controller=controller;this.#busy=true;this.#error='';this.#copies=[];this.#signature='';this.#render();
  try{const copies=await readThreadTimelineCopies({owner:this.#owner,origin:this.#origin,scope:o.scope},()=>this.#valid()&&epoch===this.#epoch,controller.signal);if(epoch!==this.#epoch||!this.#valid())return;this.#copies=copies;if(latest)this.#page=Number.MAX_SAFE_INTEGER;}
  catch(e){if(epoch===this.#epoch&&this.#valid())this.#error=e instanceof Error?e.message:'Combined history could not be opened.';}
  finally{if(epoch===this.#epoch){this.#busy=false;this.#controller=undefined;if(this.#valid())this.#render();else this.close();}}
 }
 #merge():ThreadTimeline {const o=this.#options!;return mergeThreadTimeline(this.#copies,o.scope,o.live(),o.hiddenIds?.(),n=>!!o.blocked?.(n)||!!o.client.isProfileBlocked?.(n));}
 sync():void {if(!this.active)return;if(!this.#valid()){this.close();return;}if(this.#busy)return;try{const view=this.#merge(),signature=JSON.stringify([view.entries.map(p=>[p.source,p.row]),view.conflicts,view.covered,view.blocked]);if(signature!==this.#signature)this.#render(view);}catch(e){this.#error=e instanceof Error?e.message:'Current history changed. Refresh.';this.#render();}}
 #button(text:string,run:()=>void,disabled=false):HTMLButtonElement{const b=element('button',{type:'button',className:'kl-text-button',text,onClick:()=>{if(this.#valid())run();}});b.disabled=disabled;return b;}
 #download(blob:Blob,name:string):void{if(!this.#valid())return;const url=URL.createObjectURL(blob),a=element('a');this.#urls.add(url);a.href=url;a.download=name;a.hidden=true;this.element.append(a);try{a.click();}finally{a.remove();setTimeout(()=>{URL.revokeObjectURL(url);this.#urls.delete(url);},1000);}}
 #render(prepared?:ThreadTimeline):void{
  if(!this.#valid())return;this.#release();const head=element('header',{className:'kl-history-timeline-head'},element('h3',{text:'Saved + current history'}),element('div',{className:'kl-setting-tool-buttons'},this.#button('Back to live chat',()=>{const returned=this.#options?.returned;this.close();returned?.();}),this.#button('Refresh combined history',()=>void this.#load(false),this.#busy)));
  const status=element('p',{className:'kl-setting-help'});status.setAttribute('role',this.#error?'alert':'status');this.element.replaceChildren(element('style',{text:CSS}),head,status);
  if(this.#busy){status.textContent='Checking saved batches…';return;}if(this.#error){status.textContent=this.#error;return;}
  let view:ThreadTimeline;try{view=prepared??this.#merge();}catch(e){this.#error=e instanceof Error?e.message:'Combined history could not be read.';status.setAttribute('role','alert');status.textContent=this.#error;return;}
  this.#signature=JSON.stringify([view.entries.map(p=>[p.source,p.row]),view.conflicts,view.covered,view.blocked]);
  const pages=Math.max(1,Math.ceil(view.entries.length/50));this.#page=Math.min(this.#page,pages-1);
  status.textContent=`${view.saved} saved · ${view.cloud} current · ${view.duplicates} repeated saved messages combined${view.conflicts?` · ${view.conflicts} conflicting saved messages omitted`:''}${view.fileConflicts?` · ${view.fileConflicts} conflicting files omitted`:''}${view.blocked?' · blocked senders hidden':''}.`;
  this.element.append(element('details',{className:'kl-setting-help'},element('summary',{text:'About this view'}),element('p',{text:'Read-only view. Current loaded messages take priority. Saved copies outside that window may be older; they do not restore server access. Return to live chat to reply. Original ZIPs remain available in Restore history ZIP.'})),element('div',{className:'kl-setting-tool-buttons'},this.#button('Previous history page',()=>{this.#page--;this.#render();},this.#page===0),element('span',{text:`Page ${this.#page+1} of ${pages} · ${view.entries.length} messages`}),this.#button('Next history page',()=>{this.#page++;this.#render();},this.#page+1===pages)));
  const transcript=element('div',{className:'kl-cm-messages',ariaLabel:'Combined messages'});this.element.append(transcript);
  for(const {row,source,files}of view.entries.slice(this.#page*50,this.#page*50+50)){
   const bubble=element('div',{className:'kl-cm-bubble'},element('div',{className:'kl-cm-message-meta'},element('strong',{text:`#${row.sender}`}),bindClockText(element('time'),row.createdAt,'medium-date-time')),element('small',{className:'kl-history-source',text:source==='saved'?'Saved on this device':'Current Cloud message'}),element('p',{text:row.text??'Message removed'}));
   const article=element('article',{className:`kl-cm-message${row.sender===this.#owner?' kl-cm-message--self':''}`},bubble);article.dataset.historySequence=String(row.sequence);article.dataset.historySource=source;transcript.append(article);
   for(const kind of ['image','audio'] as const)for(const id of kind==='image'?row.mediaIds:row.audioIds){
    const f=files.get(`${kind}:${id}`),title=kind==='image'?'image':'MP3';if(!f){bubble.append(element('small',{className:'kl-history-source',text:source==='cloud'?`Return to live chat to open this ${title}.`:`${title} is not available in these saved copies.`}));continue;}
    const host=element('div');bubble.append(this.#button(`Show saved ${title}`,()=>{if(host.firstChild)return;const url=URL.createObjectURL(f.blob);this.#urls.add(url);if(kind==='image'){const img=element('img',{alt:'Saved image',className:'kl-cloud-image'});img.src=url;host.append(img);}else{const audio=element('audio');audio.controls=true;audio.preload='none';audio.src=url;host.append(audio);}}),this.#button(`Download ${title}`,()=>this.#download(f.blob,`${f.assetId}.${kind==='image'?'webp':'mp3'}`)),host);
   }
  }
 }
}
