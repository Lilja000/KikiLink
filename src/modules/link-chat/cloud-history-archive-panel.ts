import { CloudHistoryArchive } from '../../cloud/history-archive';
import type { CloudHistoryArchiveAccess } from '../../cloud/history-archive-model';
import { element } from '../../utils/dom';

export class CloudHistoryArchivePanel {
  #close:(()=>void)|undefined;
  constructor(readonly root:HTMLElement|ShadowRoot){}
  close():void {this.#close?.();}
  open(access:CloudHistoryArchiveAccess,version:string,current:()=>boolean,focus?:HTMLElement):void {
    this.close();const archive=new CloudHistoryArchive(access,current);let closed=false,busy=false,controller:AbortController|undefined;
    const dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Save Cloud history'}),body=element('div',{className:'kl-dialog-body'});
    const counts=element('p'),dates=element('p',{className:'kl-setting-help'}),status=element('p',{className:'kl-setting-help'});status.setAttribute('role','status');
    const active=()=>!closed&&archive.current()&&dialog.isConnected&&dialog.open;
    const close=()=>{if(closed)return;closed=true;controller?.abort();archive.close();unsubscribe();observer.disconnect();if(dialog.open)dialog.close();dialog.remove();if(this.#close===close)this.#close=undefined;if(focus?.isConnected&&current())focus.focus({preventScroll:true});};
    const observer=new MutationObserver(()=>{if(!archive.current()||!dialog.isConnected)close();});observer.observe(this.root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
    const unsubscribe=access.client.subscribe(kind=>{if(['session','relationships','media-invalidated'].includes(kind))close();else if(kind==='connection'){if(!access.client.connected)controller?.abort();render();}});
    const read=element('button',{type:'button',className:'kl-text-button',text:'Read history batch'});
    const prepare=element('button',{type:'button',className:'kl-text-button',text:'Prepare available files'});
    const download=element('button',{type:'button',className:'kl-text-button',text:'Download history ZIP'});
    const checkpoint=element('button',{type:'button',className:'kl-text-button',text:'Save progress ZIP'});
    const file=element('input',{ariaLabel:'Choose saved progress ZIP'});file.type='file';file.accept='.zip,application/zip';file.style.maxWidth='100%';
    const stop=element('button',{type:'button',className:'kl-text-button',text:'Stop',onClick:()=>controller?.abort()});
    const render=()=>{
      if(!active())return;const s=archive.summary(),restart=!!s&&s.continuation!=='current';read.textContent=s?restart?'Read current history':'Read older batch':'Read history batch';
      read.disabled=busy||!access.client.connected||!!s&&(!restart&&s.next===null||s.messages>0&&!s.requested);prepare.disabled=busy||!access.client.connected||!s?.pending||restart;download.disabled=busy||!s?.messages;stop.hidden=!busy;
      checkpoint.disabled=busy||!s;file.disabled=busy||!!s&&s.messages>0&&!s.requested;
      counts.textContent=s?`${s.messages} messages · ${s.saved} / ${s.references} files prepared (${(s.bytes/1048576).toFixed(1)} MiB). ${s.pending} pending · ${s.unavailable} unavailable · ${s.changed} changed · ${s.tooLarge} over size limit.`:'No history has been read yet.';
      dates.textContent=s?`${s.messages?`${new Date(s.oldest).toLocaleString()} — ${new Date(s.newest).toLocaleString()}. `:''}${s.hidden} messages excluded by clear/delete rules. ${restart?'This saved batch cannot continue in the current Cloud history. Its captured messages and files can still be downloaded. Read current history starts a separate batch.':s.next===null?'End of available history.':'Older history remains.'}`:'';
    };
    const work=async(task:(signal:AbortSignal)=>Promise<void>)=>{if(busy||!active())return;busy=true;controller=new AbortController();render();try{await task(controller.signal);}catch(error){if(active())status.textContent=controller.signal.aborted?'Stopped. The previous complete batch and prepared files are kept.':error instanceof Error?error.message:'The history operation could not be completed.';}finally{busy=false;controller=undefined;if(active())render();else close();}};
    file.onchange=()=>{const selected=file.files?.[0];file.value='';if(!selected)return;void work(async signal=>{status.textContent='Checking progress ZIP…';await archive.select(selected,signal);if(active())status.textContent=archive.summary()?.continuation==='current'?'Progress checked. Read older batch to continue, or download a history ZIP for Settings. No network request was made.':'Progress checked. Captured messages and files are available for download. Read current history starts again from the latest messages. No network request was made.';});};
    read.onclick=()=>{void work(async signal=>{const s=archive.summary(),older=!!s&&s.continuation==='current';status.textContent='Reading Cloud history…';await archive.read(older,signal,(pages,messages)=>{if(active())status.textContent=`Read ${pages} pages · ${messages} messages. Checking this batch…`;});if(active())status.textContent=archive.summary()?.messages?'Batch ready. Prepare available files or download the history now.':'No messages in this batch. Continue to older history if available.';});};
    prepare.onclick=()=>{void work(async signal=>{status.textContent='Checking and preparing available files…';const result=await archive.prepare(signal,render);if(active())status.textContent=result.message;});};
    const save=(progress:boolean)=>{void work(async signal=>{
      status.textContent='Preparing ZIP…';const blob=await(progress?archive.checkpoint(signal):archive.zip(version,signal));if(!active()||signal.aborted)return;
      const summary=archive.summary()!,url=URL.createObjectURL(blob),link=element('a');link.href=url;link.download=`KikiLink-Cloud-${progress?'Progress-':''}${access.owner}-${access.peer}-before-${summary.from||'latest'}.zip`;link.hidden=true;dialog.append(link);
      try{link.click();archive.downloadRequested();status.textContent='Download requested. Keep this ZIP before reading older history; the browser may still ask where to save it.';}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    });};
    download.onclick=()=>save(false);checkpoint.onclick=()=>save(true);
    body.append(element('p',{text:`${access.peerName} · Member ${access.peer}. Read available Cloud history in batches of up to 200 messages and 100 file references.`}),
      element('p',{className:'kl-setting-help',text:'Files are optional: up to 128 MiB per batch (WebP 3 MiB, MP3 16 MiB each). Reading does not mark messages read. This saves one direct chat, not a full account.'}),
      element('p',{className:'kl-setting-help',text:'Private, unencrypted ZIPs. Save progress ZIP keeps this batch and prepared files so you can select it here after reopening the same chat and continue. Download history ZIP makes a separate copy for reviewed restore through Settings → Data & about → Choose device ZIP; current retention and deletion rules still apply.'}),
      file,counts,dates,element('div',{className:'kl-setting-tool-buttons'},read,prepare,checkpoint,download),status);
    dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Save Cloud history'})),body,
      element('footer',{className:'kl-dialog-actions'},stop,element('button',{type:'button',className:'kl-text-button',text:'Close',onClick:close})));
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);this.#close=close;this.root.append(dialog);dialog.showModal();render();read.focus({preventScroll:true});
  }
}
