import {threadHistoryFromDeviceArchive,type DeviceArchiveReview} from '../../storage/device-data-review';
import {ThreadHistoryDeviceImporter,type ThreadHistoryImportReview} from '../../storage/thread-history-device-import';
import type {DeviceImportCheckpoint} from '../../storage/device-restore-point-model';
import {element,focusedElement} from '../../utils/dom';

export class ZipThreadHistoryImportPanel {
 readonly element=element('div');
 readonly button=element('button',{type:'button',className:'kl-text-button',text:'Review saved group/channel history',onClick:()=>{void this.#open();}});
 readonly dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Restore saved group/channel history?'});
 readonly #body=element('div',{className:'kl-dialog-body'});
 readonly #status=element('p',{className:'kl-setting-help'});
 readonly #error=element('p',{className:'kl-setting-help'});
 readonly #confirm=element('button',{type:'button',className:'kl-text-button',text:'Add missing history batches',onClick:()=>{void this.#apply();}});
 #archive:DeviceArchiveReview|undefined;#review:ThreadHistoryImportReview|undefined;#controller:AbortController|undefined;#generation=0;#destroyed=false;#focus:HTMLElement|undefined;
 readonly #importer:ThreadHistoryDeviceImporter;
 constructor(readonly owner:number,readonly current:()=>boolean,readonly checkpoint?:DeviceImportCheckpoint){
  this.#importer=new ThreadHistoryDeviceImporter(owner);this.button.hidden=true;this.#status.setAttribute('role','status');this.#error.setAttribute('role','alert');this.#error.hidden=true;
  this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Restore saved history?'})),this.#body,
   element('footer',{className:'kl-dialog-actions'},element('button',{type:'button',className:'kl-text-button',text:'Cancel',onClick:()=>this.close()}),this.#confirm));
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.addEventListener('close',()=>{if(!this.dialog.open)this.close();});
  this.element.append(this.button,this.#status,this.dialog);
 }
 #active():boolean{return !this.#destroyed&&this.current();}
 #start():{current:()=>boolean;signal:AbortSignal}{this.#controller?.abort();const generation=++this.#generation;this.#controller=new AbortController();return {current:()=>this.#active()&&generation===this.#generation,signal:this.#controller.signal};}
 setArchive(archive:DeviceArchiveReview|undefined):void{this.close();this.#archive=archive;this.button.hidden=!archive?.threadHistoryAvailable;this.#status.textContent='';}
 close():void{this.#generation++;this.#controller?.abort();this.#controller=undefined;this.#review=undefined;this.#importer.cancel();this.button.disabled=false;this.#confirm.disabled=true;if(this.dialog.open)this.dialog.close();if(this.#active()&&this.#focus?.isConnected)this.#focus.focus({preventScroll:true});this.#focus=undefined;}
 destroy():void{this.#destroyed=true;this.close();this.dialog.remove();}
 async #open():Promise<void>{
  if(!this.#active()||!this.#archive||this.button.disabled)return;const job=this.#start();this.button.disabled=true;this.#status.setAttribute('role','status');this.#status.textContent='Checking saved history and original ZIP files…';
  try{
   const review=await this.#importer.review(threadHistoryFromDeviceArchive(this.#archive,this.owner),job.current,job.signal);if(!job.current())return;
   this.#review=review;this.#confirm.disabled=!review.copies;this.#error.hidden=true;this.#error.textContent='';
   this.#body.replaceChildren(element('p',{text:`Account #${this.owner} · ${review.copies} batches to add · ${review.kept} already saved · ${(review.bytes/1048576).toFixed(1)} MiB`}),
    element('p',{text:'Existing batches stay as they are. The original ZIP files, messages and included media are preserved together. Open a saved copy later through Restore history ZIP in its group or channel.'}),
    element('p',{className:'kl-setting-help',text:'These are local copies. This does not restore server access or insert messages into live conversations. No Cloud requests, sends, receipts or playback occur.'}),
    element('p',{className:'kl-setting-help',text:'Up to 8 batches / 256 MiB per account. If they do not all fit, no batch is added. Keep a downloaded copy of the original archive.'}),
    element('ul',{className:'kl-setting-help'},...review.entries.map(p=>{const li=element('li',{text:`${p.kind}: ${p.label} · ${p.messages} messages · ${p.files} files · ${p.origin}`});li.style.overflowWrap='anywhere';return li;})),this.#error);
   this.#status.textContent='';this.#focus=focusedElement(this.element);this.dialog.showModal();this.dialog.querySelector<HTMLButtonElement>('footer button')?.focus();
  }catch(error){if(job.current()){this.#status.setAttribute('role','alert');this.#status.textContent=error instanceof Error?error.message:'Saved history could not be reviewed.';}}
  finally{if(job.current())this.button.disabled=false;}
 }
 async #apply():Promise<void>{
  if(!this.#active()||!this.#review||!this.dialog.open)return;const review=this.#review,base=this.#start(),job={...base,current:()=>base.current()&&this.dialog.open};this.#review=undefined;this.#confirm.disabled=true;this.#error.hidden=false;this.#error.textContent='Saving the restore point and history batches…';
  try{
   const apply=(current=job.current)=>this.#importer.apply(review,current,job.signal),count=this.checkpoint?await this.checkpoint('thread-history',job.current,job.signal,apply):await apply();
   if(!job.current())return;this.close();this.#status.setAttribute('role','status');this.#status.textContent=`Added ${count} saved history batches. Existing copies are kept.`;
  }catch(error){if(job.current())this.#error.textContent=error instanceof Error?error.message:'Saved history import could not be confirmed. Review again before retrying.';}
 }
}
