import type {CloudClient} from '../../cloud/client';
import {ThreadHistoryArchive} from '../../cloud/thread-history-archive';
import type {ThreadHistoryScope} from '../../cloud/thread-history-format';
import {element} from '../../utils/dom';

export class ThreadHistoryArchivePanel {
  #close:(()=>void)|undefined;
  constructor(readonly root:HTMLElement|ShadowRoot){}
  close():void{this.#close?.();}
  get active():boolean{return !!this.#close;}
  open(client:CloudClient,scope:ThreadHistoryScope,current:()=>boolean,focus?:HTMLElement):void{
    this.close();const archive=new ThreadHistoryArchive(client,scope,current);let closed=false,busy=false,controller:AbortController|undefined;
    const dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Save group or channel history'}),body=element('div',{className:'kl-dialog-body'});
    const counts=element('p'),status=element('p',{className:'kl-setting-help'});status.setAttribute('role','status');
    const active=()=>!closed&&archive.current()&&dialog.isConnected&&dialog.open;
    const close=()=>{if(closed)return;closed=true;controller?.abort();archive.close();unsubscribe();observer.disconnect();if(dialog.open)dialog.close();dialog.remove();if(this.#close===close)this.#close=undefined;if(focus?.isConnected&&current())focus.focus({preventScroll:true});};
    const observer=new MutationObserver(()=>{if(!archive.current()||!dialog.isConnected)close();});observer.observe(this.root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    const unsubscribe=client.subscribe(kind=>{if(['session','disconnected','groups','communities','blocks','relationships','media-invalidated'].includes(kind))close();else if(kind==='connection'){if(!client.connected)controller?.abort();render();}});
    const read=element('button',{type:'button',className:'kl-text-button',text:'Read history batch'}),download=element('button',{type:'button',className:'kl-text-button',text:'Download history ZIP'});
    const prepare=element('button',{type:'button',className:'kl-text-button',text:'Prepare available files'});
    const file=element('input',{ariaLabel:'Choose saved history ZIP'});file.type='file';file.accept='.zip,application/zip';file.style.maxWidth='100%';
    const stop=element('button',{type:'button',className:'kl-text-button',text:'Stop',onClick:()=>controller?.abort()});
    const render=()=>{if(!active())return;const s=archive.summary(),restart=s?.continuation==='changed'||s?.continuation==='unverified',check=s?.continuation==='unchecked'&&s.next===null;
      read.textContent=s?restart?'Read current history':check?'Check current history':'Read older batch':'Read history batch';read.disabled=busy||!client.connected||!!s&&(!s.requested||s.next===null&&!restart&&!check);download.disabled=busy||!client.connected||!s;prepare.disabled=busy||!client.connected||!s?.pending||restart;file.disabled=busy||!!s&&!s.requested;stop.hidden=!busy;
      counts.textContent=s?`${s.messages} messages · ${s.deleted} deleted markers · ${s.saved} / ${s.references} files prepared (${(s.bytes/1048576).toFixed(1)} MiB). ${s.pending} pending · ${s.unavailable} unavailable · ${s.changed} changed · ${s.overLimit} over limit. ${s.additionalFields?`${s.additionalFields} additional fields in ${s.additionalMessages} messages preserved as inactive data. `:''}${restart?'This saved batch cannot continue in the current Cloud history. Keep the original ZIP; Read current history starts a separate batch.':s.next===null?'End of captured history.':'Older history remains.'}`:'No history read. Choose a saved ZIP to resume, or read the latest batch.';};
    const work=async(task:(signal:AbortSignal)=>Promise<void>)=>{if(busy||!active())return;busy=true;controller=new AbortController();render();try{await task(controller.signal);}catch(error){if(active())status.textContent=controller.signal.aborted?'Stopped. The previous complete batch is kept.':error instanceof Error?error.message:'Could not prepare history.';}finally{busy=false;controller=undefined;if(active())render();else close();}};
    file.onchange=()=>{const selected=file.files?.[0];file.value='';if(!selected)return;void work(async signal=>{status.textContent='Checking history ZIP…';await archive.select(selected,signal);if(active())status.textContent=archive.summary()?.continuation==='unverified'?'ZIP checked. Keep its captured messages and files. Read current history starts a new batch; no network request was made.':'ZIP checked. Current history and access will be checked when continuing; no network request was made.';});};
    read.onclick=()=>{void work(async signal=>{const s=archive.summary();if(s?.continuation==='unchecked'&&s.next===null){status.textContent='Checking current history…';await archive.checkContinuation(signal);if(active())status.textContent='History checked. The captured batch is unchanged.';return;}
      const restart=s?.continuation==='changed'||s?.continuation==='unverified';status.textContent='Reading history…';await archive.read(signal,(pages,messages)=>{if(active())status.textContent=`Read ${pages} pages · ${messages} messages. Checking access…`;},restart);if(active())status.textContent='Batch ready. Download and keep this ZIP before continuing.';});};
    prepare.onclick=()=>{void work(async signal=>{status.textContent='Checking and preparing available files…';const result=await archive.prepare(signal,render);if(active())status.textContent=result.message;});};
    download.onclick=()=>{void work(async signal=>{status.textContent='Checking access and preparing ZIP…';const blob=await archive.zip(signal);if(!active()||signal.aborted)return;
      const s=archive.summary()!,url=URL.createObjectURL(blob),link=element('a');link.href=url;link.download=`KikiLink-${scope.kind}-${archive.identity.owner}-${scope.id}-before-${s.from||'latest'}.zip`;link.hidden=true;dialog.append(link);
      try{link.click();archive.downloadRequested();status.textContent='Download requested. Keep this ZIP; the browser may still ask where to save it.';}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    });};
    body.append(element('p',{text:scope.label}),element('p',{className:'kl-setting-help',text:'Save up to 200 messages per batch (1 MiB of text and metadata). Files are optional: up to 100 unique files and 128 MiB per batch, WebP 3 MiB and MP3 16 MiB each. Current Cloud access and retention rules apply.'}),
      element('p',{className:'kl-setting-help',text:'Private, unencrypted ZIP. Keep every batch. After reopening this conversation, select a saved ZIP and explicitly read the older batch. It does not restore messages into the conversation or save a full account.'}),
      file,counts,element('div',{className:'kl-setting-tool-buttons'},read,prepare,download),status);
    dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Save history ZIP'})),body,element('footer',{className:'kl-dialog-actions'},stop,element('button',{type:'button',className:'kl-text-button',text:'Close',onClick:close})));
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);this.#close=close;this.root.append(dialog);dialog.showModal();render();read.focus({preventScroll:true});
  }
}
