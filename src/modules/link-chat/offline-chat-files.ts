import { archivedChatAttachments } from '../../core/chat-attachments';
import { ChatFileArchiveImporter } from '../../storage/chat-file-archive-import';
import { chatFileId, makeChatFile } from '../../storage/chat-file-model';
import type { CloudClient } from '../../cloud/client';
import { downloadChatFile } from '../../cloud/chat-file-download';
import { element } from '../../utils/dom';

/** One dialog per chat view; file reads, downloads and playback all require a click. */
export class OfflineChatFiles {
 #close:(()=>void)|undefined;
 constructor(readonly root:HTMLElement|ShadowRoot,readonly client:()=>CloudClient|undefined){}
 close():void {this.#close?.();}
 render(value:unknown,owner:number,current:()=>boolean):HTMLElement|undefined {
  const refs=archivedChatAttachments(value);if(!refs||!Number.isSafeInteger(owner)||owner<=0)return;
  const button=element('button',{type:'button',className:'kl-text-button',text:'Save or open offline files'});
  button.onclick=()=>{if(button.isConnected&&!button.closest('[hidden]')&&current())this.#open(refs,owner,()=>button.isConnected&&current(),button);};return button;
 }
 #open(refs:{images:string[];audio:string[]},owner:number,current:()=>boolean,focus:HTMLElement):void {
  this.close();const store=new ChatFileArchiveImporter(owner),controller=new AbortController();let closed=false,busy=false,url:string|undefined,player:HTMLAudioElement|undefined;
  const dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Saved chat files'}),body=element('div',{className:'kl-dialog-body'}),preview=element('div');
  const status=element('p',{className:'kl-setting-help'});status.setAttribute('role','status');const actions:HTMLButtonElement[]=[];
  const active=()=>!closed&&current()&&dialog.isConnected&&dialog.open;
  const clear=()=>{if(player){player.pause();player.removeAttribute('src');player.load();player=undefined;}if(url){URL.revokeObjectURL(url);url=undefined;}preview.replaceChildren();};
  const close=()=>{if(closed)return;closed=true;controller.abort();observer.disconnect();clear();if(dialog.open)dialog.close();dialog.remove();if(this.#close===close)this.#close=undefined;if(focus.isConnected&&current())focus.focus({preventScroll:true});};
  const observer=new MutationObserver(()=>{if(!current()||!focus.isConnected||focus.closest('[hidden]'))close();});observer.observe(this.root,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  this.#close=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
  const work=async(task:()=>Promise<void>)=>{if(busy||!active())return;busy=true;for(const a of actions)a.disabled=true;status.textContent='Checking file…';try{await task();}catch(e){if(active())status.textContent=e instanceof Error?e.message:'The file operation could not be confirmed.';}finally{busy=false;if(active())for(const a of actions)a.disabled=false;}};
  body.append(element('p',{text:'Keep selected files on this device, then include them in Download device data. Saved copies can be opened without Cloud.'}),
   element('p',{className:'kl-setting-help',text:'Private, unencrypted copies · up to 100 files / 128 MiB. Only available Cloud files can be saved. Removing a local copy does not remove it from older ZIPs or recovery copies.'}));
  for(const [kind,ids]of [['image',refs.images],['audio',refs.audio]] as const)for(const [index,id]of ids.entries()){
   const key=chatFileId(kind,id),row=element('section'),title=`${kind==='image'?'Image':'Audio'} ${index+1}`;
   const save=element('button',{type:'button',className:'kl-text-button',text:`Save ${title.toLowerCase()} offline`,onClick:()=>{void work(async()=>{
    const existing=await store.get(key,active,controller.signal);if(existing){if(active())status.textContent=`${title} is already saved. The current copy was kept.`;return;}
    const client=this.client();if(!client)throw new Error('Connect to Cloud to save this file.');
    status.textContent='Downloading the selected file…';const blob=await downloadChatFile(client,owner,kind,id,active,controller.signal);
    const check=()=>{if(!active()||controller.signal.aborted||!client.connected||client.memberNumber!==owner)throw new Error('Saving cancelled.');};
    const file=await makeChatFile(kind,id,blob,check,controller.signal);await store.save(file,()=>{try{check();return true;}catch{return false;}},controller.signal);
    if(active())status.textContent=`${title} saved offline. Include it in your next device ZIP.`;
   });}});
   const open=element('button',{type:'button',className:'kl-text-button',text:`Open saved ${title.toLowerCase()}`,onClick:()=>{void work(async()=>{
    const file=await store.get(key,active,controller.signal);if(!active())return;if(!file)throw new Error('No offline copy is saved on this device. Save it from Cloud or restore a device ZIP.');clear();url=URL.createObjectURL(file.blob);
    if(kind==='image'){const image=element('img',{src:url,alt:'Saved chat image'});image.style.maxWidth='100%';image.style.maxHeight='45vh';preview.append(image);}
    else{player=element('audio',{ariaLabel:'Saved chat audio'});player.controls=true;player.preload='none';player.src=url;player.style.width='100%';preview.append(player);}
    status.textContent=kind==='audio'?'Saved audio opened. Press Play to listen.':'Opened the saved image. No Cloud request was made.';
   });}});
   const remove=element('button',{type:'button',className:'kl-text-button',text:`Remove saved ${title.toLowerCase()}`,onClick:()=>{void work(async()=>{clear();await store.remove(key,active,controller.signal);if(active())status.textContent=`${title} removed from active offline storage. Older backups and recovery copies are kept.`;});}});
   actions.push(save,open,remove);row.append(element('p',{text:title}),element('div',{className:'kl-setting-tool-buttons'},save,open,remove));body.append(row);
  }
  body.append(status,preview);dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Saved chat files'})),body,element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Close',onClick:close})));this.root.append(dialog);dialog.showModal();
 }
}
