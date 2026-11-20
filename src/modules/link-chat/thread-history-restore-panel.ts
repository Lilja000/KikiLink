import type {CloudClient} from '../../cloud/client';
import type {ThreadHistoryScope} from '../../cloud/thread-history-format';
import {ThreadHistoryCopyStore,type OpenThreadCopy} from '../../storage/thread-history-copy-store';
import type {ThreadHistoryCopyInfo} from '../../storage/thread-history-copy-model';
import {bindClockText,formatDateTime} from '../../core/time-format';
import {element} from '../../utils/dom';

export class ThreadHistoryRestorePanel {
 #close:(()=>void)|undefined;
 constructor(readonly root:HTMLElement|ShadowRoot){}
 get active():boolean{return !!this.#close;}
 close():void{this.#close?.();}
 open(client:CloudClient,scope:ThreadHistoryScope,current:()=>boolean,focus?:HTMLElement,blocked:(member:number)=>boolean=()=>false):void{
  this.close();const owner=client.memberNumber,origin=client.origin;let closed=false,busy=false,controller:AbortController|undefined;
  const valid=()=>!closed&&current()&&client.memberNumber===owner&&client.origin===origin;
  const store=new ThreadHistoryCopyStore({owner,origin,scope},valid),urls=new Set<string>();
  const dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restored group or channel history'}),body=element('div',{className:'kl-dialog-body'});
  const status=element('p',{className:'kl-setting-help'});status.setAttribute('role','status');
  const input=element('input',{ariaLabel:'Choose history ZIP to restore'});input.type='file';input.accept='.zip,application/zip';input.style.maxWidth='100%';
  const saved=element('div'),preview=element('section',{ariaLabel:'Saved history preview'}),actions=element('div',{className:'kl-setting-tool-buttons'});
  let copies:ThreadHistoryCopyInfo[]=[],display:OpenThreadCopy|undefined,ready=false,savedSelection=false,removeAsked=false,start=0;
  const active=()=>valid()&&dialog.isConnected&&dialog.open;
  const revoke=()=>{for(const media of preview.querySelectorAll('audio')){media.pause();media.removeAttribute('src');media.load();}for(const url of urls)URL.revokeObjectURL(url);urls.clear();};
  const close=()=>{if(closed)return;closed=true;controller?.abort();store.close();revoke();unsubscribe();observer.disconnect();if(dialog.open)dialog.close();dialog.remove();if(this.#close===close)this.#close=undefined;if(focus?.isConnected&&current())focus.focus({preventScroll:true});};
  const observer=new MutationObserver(()=>{if(!valid()||!dialog.isConnected)close();});observer.observe(this.root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  const unsubscribe=client.subscribe(kind=>{if(['session','disconnected','groups','communities','blocks','relationships','media-invalidated'].includes(kind)||!valid())close();});
  const work=async(task:(signal:AbortSignal)=>Promise<void>)=>{if(busy||!active())return;busy=true;controller=new AbortController();render();try{await task(controller.signal);}catch(error){if(active())status.textContent=controller.signal.aborted?'Stopped. Saved batches are kept.':error instanceof Error?error.message:'Saved history could not be opened.';}finally{busy=false;controller=undefined;if(active())render();else close();}};
  const button=(text:string,run:()=>void)=>{const b=element('button',{type:'button',className:'kl-text-button',text,onClick:()=>{if(active()&&!busy)run();}});b.disabled=busy;return b;};
  const refresh=async(signal:AbortSignal)=>{copies=await store.list(signal);if(savedSelection&&display&&!copies.some(p=>p.id===display!.info.id)){display=undefined;savedSelection=false;removeAsked=false;}};
  const download=(blob:Blob,name:string)=>{if(!active()||busy)return;const url=URL.createObjectURL(blob),a=element('a');urls.add(url);a.href=url;a.download=name;a.hidden=true;dialog.append(a);try{a.click();status.textContent='Download requested. Keep this file; the browser may still ask where to save it.';}finally{a.remove();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},1000);}};
  const show=(copy:OpenThreadCopy,isSaved:boolean)=>{revoke();display=copy;savedSelection=isSaved;ready=!isSaved;removeAsked=false;start=Math.max(0,copy.batch.rows.length-50);};
  const render=()=>{
   if(!active())return;revoke();input.disabled=busy;stop.hidden=!busy;
   saved.replaceChildren(element('h3',{text:'Saved on this device'}),...copies.map(copy=>button(`${copy.summary.messages} messages · ${formatDateTime(copy.createdAt)} · ${(copy.bytes/1048576).toFixed(1)} MiB`,()=>{void work(async signal=>{show(await store.get(copy.id,signal),true);status.textContent='Saved copy opened locally.';});})));
   if(!copies.length)saved.append(element('p',{className:'kl-setting-help',text:'No restored batches for this conversation.'}));
   saved.append(button('Refresh saved batches',()=>{void work(async signal=>{await refresh(signal);status.textContent='Saved batches refreshed.';});}));
   preview.replaceChildren();actions.replaceChildren();if(!display)return;
   const copy=display,s=copy.info.summary;
   preview.append(element('h3',{text:savedSelection?'Restored batch':'Review selected batch'}),element('p',{text:`${s.messages} messages · ${s.files} saved files${s.additionalFields?` · ${s.additionalFields} additional fields preserved as inactive data`:''}.`}));
   if(ready)actions.append(button('Restore this batch',()=>{void work(async signal=>{show(await store.restore(signal),true);await refresh(signal);status.textContent='Batch restored on this device. It is available here after reopening.';});}));
   actions.append(button('Download original ZIP',()=>download(copy.zip,`KikiLink-${scope.kind}-saved-${copy.info.id.slice(0,12)}.zip`)));
   if(savedSelection){
    if(removeAsked)actions.append(element('p',{text:'Remove this saved batch from this device? Keep its downloaded ZIP if you may need it again.'}),button('Confirm removal',()=>{void work(async signal=>{await store.remove(copy.info.id,signal);display=undefined;ready=false;savedSelection=false;removeAsked=false;await refresh(signal);status.textContent='Saved batch removed from this device.';});}),button('Keep batch',()=>{removeAsked=false;render();}));
    else actions.append(button('Remove saved batch',()=>{removeAsked=true;render();}));
   }
   const rows=copy.batch.rows,files=new Map(copy.batch.media?.files.map(f=>[f.id,f]));
   const pagination=element('div',{className:'kl-setting-tool-buttons'}),older=button('Older saved messages',()=>{start=Math.max(0,start-50);render();}),newer=button('Newer saved messages',()=>{start=Math.min(Math.max(0,rows.length-50),start+50);render();});older.disabled=busy||start===0;newer.disabled=busy||start+50>=rows.length;
   pagination.append(older,newer,element('span',{text:rows.length?`Messages ${start+1}–${Math.min(start+50,rows.length)} of ${rows.length}`:'Empty saved batch'}));preview.append(pagination);
   const transcript=element('div',{className:'kl-cm-messages',ariaLabel:'Archived messages'});transcript.style.maxHeight='none';transcript.style.overflow='visible';preview.append(transcript);let hidden=0;
   for(const row of rows.slice(start,start+50)){
    try{if(blocked(row.sender)||client.isProfileBlocked?.(row.sender)){hidden++;continue;}}catch{hidden++;continue;}
    const text=element('p',{text:row.text??'Message removed'}),bubble=element('div',{className:'kl-cm-bubble'},element('div',{className:'kl-cm-message-meta'},element('strong',{text:`#${row.sender}`}),bindClockText(element('time'),row.createdAt,'medium-date-time')),text);
    const article=element('article',{className:`kl-cm-message${row.sender===owner?' kl-cm-message--self':''}`},bubble);article.dataset.copySequence=String(row.sequence);transcript.append(article);
    for(const kind of ['image','audio'] as const)for(const id of kind==='image'?row.mediaIds:row.audioIds){
     const file=files.get(`${kind}:${id}`),title=kind==='image'?'image':'MP3';
     if(!file){bubble.append(element('small',{text:`${title==='image'?'Image':'MP3'} not included in this ZIP.`}));continue;}
     const mediaHost=element('div');bubble.append(button(`Show saved ${title}`,()=>{
      if(mediaHost.firstChild)return;const url=URL.createObjectURL(file.blob);urls.add(url);
      if(kind==='image'){const img=element('img',{alt:'Saved image',className:'kl-cloud-image'});img.src=url;img.style.maxWidth='100%';img.style.maxHeight='260px';mediaHost.append(img);}
      else{const audio=element('audio');audio.controls=true;audio.preload='none';audio.src=url;audio.style.maxWidth='100%';mediaHost.append(audio);}
     }),button(`Download ${title}`,()=>download(file.blob,`${file.assetId}.${kind==='image'?'webp':'mp3'}`)),mediaHost);
    }
   }
   if(hidden)preview.append(element('p',{className:'kl-setting-help',text:'Some saved messages are hidden by your current blocks.'}));
  };
  input.onchange=()=>{const file=input.files?.[0];input.value='';if(!file)return;void work(async signal=>{status.textContent='Checking history ZIP…';show(await store.review(file,signal),false);status.textContent='ZIP checked. Review this batch, then restore it explicitly.';});};
  const stop=element('button',{type:'button',className:'kl-text-button',text:'Stop',onClick:()=>controller?.abort()});
  body.append(element('p',{text:scope.label}),element('p',{className:'kl-setting-help',text:'Read a saved copy of this conversation on this device. Copies may differ from current Cloud history. Restoring never sends messages or changes read receipts.'}),element('p',{className:'kl-setting-help',text:'Keep a downloaded copy: saved batches are included in Download device data and also have their own original ZIP downloads. Up to 8 batches / 256 MiB per account. Saved copies are private and unencrypted.'}),input,saved,actions,preview,status);
  dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restored history'})),body,element('footer',{className:'kl-dialog-actions'},stop,element('button',{type:'button',className:'kl-text-button',text:'Close',onClick:close})));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);this.#close=close;this.root.append(dialog);dialog.showModal();render();input.focus({preventScroll:true});void work(async signal=>{await refresh(signal);status.textContent='Choose a ZIP to review, or open a saved batch.';});
 }
}
