import {NativeRestorePointStore,type RestorePointStore} from '../../storage/device-restore-point-store';
import {withRestorePointLock} from '../../storage/device-restore-session';
import type {RestorePointInfo} from '../../storage/device-restore-point-model';
import {element} from '../../utils/dom';

export class DeviceRestorePointsPanel {
 readonly element=element('div');
 readonly button=element('button',{type:'button',className:'kl-text-button',text:'Saved restore points',onClick:()=>{void this.#open();}});
 readonly dialog=element('dialog',{className:'kl-dialog kl-settings-recovery-dialog',ariaLabel:'Saved device restore points'});
 readonly #select=document.createElement('select');readonly #details=element('p',{className:'kl-setting-help'});readonly #status=element('p',{className:'kl-setting-help'});
 readonly #actions=element('div',{className:'kl-setting-tool-buttons'});readonly #confirm=element('button',{type:'button',className:'kl-text-button',text:'Remove this restore point',onClick:()=>{void this.#remove();}});
 #rows:RestorePointInfo[]=[];#controller:AbortController|undefined;#generation=0;#busy=false;#destroyed=false;#observer:MutationObserver|undefined;
 constructor(readonly owner:number,readonly current:()=>boolean,readonly review:(blob:Blob)=>Promise<void>,readonly beforeOpen:()=>void,readonly store:RestorePointStore=new NativeRestorePointStore(owner)) {
  this.#select.className='kl-select';this.#select.setAttribute('aria-label','Saved restore point');this.#select.style.width='100%';this.#select.style.maxWidth='100%';this.#select.onchange=()=>this.#render();this.#status.setAttribute('role','status');
  for(const [kind,label]of [['before','Review saved snapshot'],['source','Review original ZIP'],['before','Download saved snapshot'],['source','Download original ZIP']] as const){const open=label.startsWith('Review');this.#actions.append(element('button',{type:'button',className:'kl-text-button',text:label,onClick:()=>{void this.#use(kind,open);}}));}
  this.#actions.append(element('button',{type:'button',className:'kl-text-button',text:'Remove restore point',onClick:()=>{if(this.#busy||!this.#active()||!this.#selected())return;this.#confirm.hidden=false;this.#status.textContent='Removing this copy also removes its original ZIP and operation record. Download anything you want to keep first. Active data and section recovery copies are kept.';}}));
  const body=element('div',{className:'kl-dialog-body'});body.style.overflowWrap='anywhere';body.append(
   element('p',{text:'Saved device data from before an import, plus its original ZIP. Review either archive to restore supported sections. No operation is resumed automatically.'}),
   element('p',{className:'kl-setting-help',text:'Private, unencrypted copies · up to 5 points / 1 GiB, 512 MiB per ZIP. Existing copies are never removed automatically. These copies share this browser’s storage; download them for a separate backup.'}),
   this.#select,this.#details,this.#actions,this.#status);
  this.dialog.append(element('header',{className:'kl-dialog-header'},element('h2',{text:'Saved device restore points'})),body,
   element('footer',{className:'kl-dialog-actions'},this.#confirm,element('button',{type:'button',className:'kl-text-button',text:'Close',onClick:()=>this.close()})));
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.dialog.addEventListener('close',()=>{if(!this.dialog.open)this.close();});this.element.append(this.button,this.dialog);this.#confirm.hidden=true;
 }
 #active():boolean {return !this.#destroyed&&this.current()&&this.dialog.open;}
 #selected():RestorePointInfo|undefined {return this.#rows.find(row=>row.id===this.#select.value);}
 close():void {++this.#generation;this.#controller?.abort();this.#controller=undefined;this.#observer?.disconnect();this.#observer=undefined;this.#rows=[];this.#select.replaceChildren();this.#details.textContent='';this.#status.textContent='';this.#confirm.hidden=true;this.#busy=false;if(this.dialog.open)this.dialog.close();}
 destroy():void {this.#destroyed=true;this.close();this.dialog.remove();}
 #render():void {
  const p=this.#selected();this.#select.disabled=this.#busy||!this.#rows.length;this.#confirm.hidden=true;
  for(const button of this.#actions.querySelectorAll('button'))button.disabled=this.#busy||!p;
  this.#details.textContent=p?`${(p.bytes/1048576).toFixed(1)} MiB · ${p.operations.filter(o=>o.state==='complete').length} completed · ${p.operations.filter(o=>o.state==='pending').length} pending / interrupted · ${p.operations.filter(o=>o.state==='uncertain').length} uncertain. ${p.operations.map(o=>o.action+': '+o.state).join(' · ')}${p.operations.some(o=>o.state!=='complete')?' Check the affected section’s recovery before retrying.':''}`:'No saved restore points for this account.';
 }
 async #work(task:(current:()=>boolean,signal:AbortSignal)=>Promise<void>):Promise<void> {
  if(this.#busy||!this.#active())return;const generation=++this.#generation,controller=new AbortController();this.#controller=controller;this.#busy=true;this.#render();
  const current=()=>generation===this.#generation&&this.#active();
  try{await task(current,controller.signal);}catch(e){if(current())this.#status.textContent=e instanceof Error?e.message:'Restore point operation could not be confirmed.';}finally{if(current()){this.#busy=false;this.#controller=undefined;this.#render();}}
 }
 async #load(current:()=>boolean,signal:AbortSignal):Promise<void> {
  const rows=await this.store.list(current,signal);if(!current())return;this.#rows=rows;this.#select.replaceChildren(...rows.map(row=>{const option=document.createElement('option');option.value=row.id;option.textContent=`${new Date(row.createdAt).toLocaleString()} · ${row.id.slice(0,8)}`;return option;}));this.#render();
 }
 async #open():Promise<void> {
  if(this.#destroyed||!this.current())return;this.beforeOpen();this.close();this.dialog.showModal();this.#observer=new MutationObserver(()=>{if(!this.current())this.close();});this.#observer.observe(this.element.getRootNode(),{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  await this.#work(async(current,signal)=>{this.#status.textContent='Reading saved restore points…';await this.#load(current,signal);if(current())this.#status.textContent='';});
 }
 async #use(kind:'before'|'source',review:boolean):Promise<void> {
  const selected=this.#selected();if(!selected)return;
  await this.#work(async(current,signal)=>{
   this.#status.textContent='Checking saved ZIP bytes…';const point=await this.store.get(selected,current,signal);if(!current()||signal.aborted)return;
   const blob=point[kind];if(review){this.close();await this.review(blob);return;}
   const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=`KikiLink-restore-${this.owner}-${point.id}-${kind}.zip`;a.hidden=true;this.element.append(a);try{a.click();this.#status.textContent='Download requested. Keep this private ZIP somewhere separate from this browser.';}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  });
 }
 async #remove():Promise<void> {
  if(this.#confirm.hidden)return;const selected=this.#selected();if(!selected)return;
  await this.#work(async(current,signal)=>{await withRestorePointLock(this.owner,current,signal,()=>this.store.remove(selected,current,signal));if(current()){await this.#load(current,signal);this.#status.textContent='Restore point removed. Active data and section recovery copies were kept.';}});
 }
}
