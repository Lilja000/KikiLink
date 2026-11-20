import {element} from '../../cloud/dom';
import {workshopNote as note} from './workshop-model';
import {WorkshopAutomaticSync,type WorkshopSyncPolicy} from './workshop-sync';

export class WorkshopSyncPanel {
 readonly element=element('section',{className:'kl-workshop-sync',ariaLabel:'Workshop sync settings'});
 #visible=false;#generation=0;#busy=false;#message='';#confirmation:WorkshopSyncPolicy|undefined;
 constructor(readonly sync:WorkshopAutomaticSync,readonly options:{current():boolean;connected():boolean;review(id:string):void}){}
 hide():void{this.#visible=false;this.#generation++;this.#busy=false;this.#confirmation=undefined;this.element.replaceChildren();}
 open():void{this.hide();this.#visible=true;this.#message='';this.refresh();}
 #valid():()=>boolean{const token=this.#generation;return()=>this.#visible&&token===this.#generation&&this.options.current();}
 #button(label:string,action:()=>void):HTMLButtonElement{const valid=this.#valid(),b=element('button',{type:'button',className:'kl-text-button',text:label});b.disabled=this.#busy;b.onclick=()=>{if(valid()&&!this.#busy)action();};return b;}
 #change(action:(valid:()=>boolean)=>Promise<void>):void{const valid=this.#valid();this.#busy=true;this.refresh();void action(valid).then(()=>{if(valid()){this.#message='Sync settings saved on this device.';this.#confirmation=undefined;this.sync.settingsChanged();}}).catch(error=>{if(valid())this.#message=error instanceof Error?error.message:'Could not save sync settings.';}).finally(()=>{if(valid()){this.#busy=false;this.refresh();}});}
 refresh():void{
  if(!this.#visible)return;
  this.element.replaceChildren(element('h2',{text:'Sync settings'}),note('Choose which matching local and private Cloud drafts to link in Review Cloud sync. These settings apply only to this account and Cloud service on this device.'),element('div',{role:'status'},note(this.#busy?'Saving sync settings…':this.#message||this.sync.message)));
  try{
   const policy=this.sync.settings.read();this.element.append(note(policy.mode==='automatic'?'Automatic sync is on for linked drafts while Workshop is open.':'Manual mode. Drafts are never transferred automatically.'),note('Changes on one side can transfer in either direction. Changes on both sides pause for review. An open editor is never replaced. Deletions are not synced. Nothing is published.'));
   if(this.#confirmation){const expected=this.#confirmation;this.element.append(note('Enable automatic transfers for linked drafts on this device? Returning to Workshop or reconnecting may send or restore saved changes.'),this.#button('Confirm automatic sync',()=>this.#change(valid=>this.sync.settings.mode('automatic',expected,valid))),this.#button('Keep manual mode',()=>{this.#confirmation=undefined;this.refresh();}));}
   else if(policy.mode==='manual')this.element.append(this.#button('Enable automatic sync',()=>{this.#confirmation=policy;this.refresh();}));
   else this.element.append(this.#button('Pause automatic sync',()=>{this.sync.suspend();this.#change(valid=>this.sync.settings.mode('manual',policy,valid));}));
   const now=this.#button('Sync linked drafts now',()=>{this.#busy=true;this.refresh();const valid=this.#valid();void this.sync.run(true).finally(()=>{if(valid()){this.#busy=false;this.#message='';this.refresh();}});});now.disabled=this.#busy||!this.options.connected();this.element.append(now,this.#button('Refresh sync settings',()=>{this.#message='';this.#confirmation=undefined;this.refresh();}));
   if(!policy.links.length)this.element.append(note('No linked drafts. Save or restore a private Cloud copy, review both identical copies, then choose Link automatic sync.'));
   let drafts:ReturnType<typeof this.sync.drafts.list>=[];try{drafts=this.sync.drafts.list();}catch(error){this.element.append(note(error instanceof Error?error.message:'Local drafts unavailable.'));}
   for(const link of policy.links){
    const local=drafts.find(v=>v.id===link.id),reason=link.reason==='conflict'?'Both copies changed. Review them before continuing.':link.reason==='cloud-missing'?'Cloud copy was deleted or is missing. Local copies are kept.':link.reason==='local-missing'?'Local copy was removed. Cloud copy is kept.':link.reason==='error'?'A sync result needs review. Copies are kept.':'Linked; one-sided changes can sync.';
    const review=this.#button('Review sync copies',()=>this.options.review(link.id));review.disabled=this.#busy||!this.options.connected();
    this.element.append(element('article',{className:'kl-workshop-card'},element('h3',{text:local?.draft.title||'Linked draft'}),note(local?.draft.type??link.id),note(reason),review,this.#button('Stop syncing this draft',()=>{this.sync.suspend();this.#change(valid=>this.sync.settings.unlink(link,valid));})));
   }
  }catch(error){this.element.append(note(error instanceof Error?error.message:'Sync settings unavailable.'));}
 }
}
