import {element} from '../../cloud/dom';
import {workshopNote as note} from './workshop-model';
import {WorkshopInstallSharing,type SharedInstallations} from './workshop-install-sharing';
export class WorkshopInstallSharingPanel {
 readonly element=element('section',{ariaLabel:'Installation sharing'});
 #visible=false;#generation=0;#view=0;#busy=false;#message='';#review:SharedInstallations|undefined;#confirm=false;#forget=false;
 constructor(readonly sharing:WorkshopInstallSharing,readonly current:()=>boolean){}
 hide():void{this.#visible=false;this.#generation++;this.#busy=false;this.#review=undefined;this.#confirm=false;this.#forget=false;this.element.replaceChildren();}
 open():void{this.hide();this.#visible=true;this.#message='';this.#render();}
 changed():void{if(this.#visible){this.#generation++;this.#busy=false;this.#review=undefined;this.#confirm=false;this.#forget=false;this.#render();}}
 #valid():()=>boolean{const g=this.#generation;return()=>this.#visible&&this.current()&&this.sharing.current()&&g===this.#generation;}
 #button(text:string,action:()=>void):HTMLButtonElement{const valid=this.#valid(),view=this.#view,b=element('button',{type:'button',className:'kl-text-button',text});b.disabled=this.#busy;b.onclick=()=>{if(valid()&&view===this.#view&&this.element.isConnected&&this.element.contains(b)&&!this.#busy)action();};return b;}
 #run(action:(valid:()=>boolean)=>Promise<void>):void{const valid=this.#valid();this.#busy=true;this.#render();void action(valid).catch(e=>{if(valid())this.#message=e instanceof Error?e.message:'Installation sharing failed.';}).finally(()=>{if(valid()){this.#busy=false;this.#render();}});}
 #render():void{
  if(!this.#valid()()){this.element.replaceChildren();return;}this.#view++;
  this.element.replaceChildren(element('h2',{text:'Installation sharing'}),note('Optional, off by default for every installation. Only packages you choose to share affect reported counts and recommendations. Updates and reinstalls count once per account. This is not a count of active devices.'),element('p',{role:'status',text:this.#message}));
  try{
   const pending=this.sharing.read();
   if(pending){
    this.element.append(element('h3',{text:'Pending installation report'}),note(pending.action==='clear'?'Clear shared installation history':`Share ${pending.entries.length} reviewed installation(s)`),note(pending.confirmed?'Cloud confirmed this request. Finish cleanup without sending it again.':'Reload and reconnect never resend this request. Retry uses the exact saved revision and operation.'));
    const retry=this.#button(pending.confirmed?'Finish sharing recovery':'Retry installation report',()=>this.#run(async valid=>{await this.sharing.run(pending,valid);if(valid()){this.#review=undefined;this.#message='Installation report finished. Installed copies are unchanged.';}}));retry.disabled=this.#busy||!pending.confirmed&&!this.sharing.client.connected;this.element.append(retry);
    if(!pending.confirmed){if(this.#forget)this.element.append(note('Forgetting cannot undo a report already committed in Cloud.'),this.#button('Confirm forget installation report',()=>this.#run(async valid=>{await this.sharing.forget(pending,valid);if(valid()){this.#forget=false;this.#message='Pending request forgotten. Load shared installations to check Cloud.';}})),this.#button('Keep installation report',()=>{this.#forget=false;this.#render();}));else this.element.append(this.#button('Forget installation report',()=>{this.#forget=true;this.#render();}));}
   }
   const load=this.#button('Load shared installations',()=>this.#run(async valid=>{const review=await this.sharing.load(valid);if(valid()){this.#review=review;this.#confirm=false;this.#message='Shared installation history loaded.';}}));load.disabled=this.#busy||!this.sharing.client.connected;this.element.append(load);
   if(this.#review){this.element.append(note(`${this.#review.entries.length} shared packages. Clearing removes these reports from counts and your recommendation history; installed copies and reviews stay unchanged.`));
    if(!pending&&this.#review.entries.length){if(this.#confirm){const review=this.#review;this.element.append(this.#button('Confirm clear shared installations',()=>this.#run(async valid=>{const pending=await this.sharing.prepare(review,[],valid,true);await this.sharing.run(pending,valid);if(valid()){this.#review=undefined;this.#confirm=false;this.#message='Shared installation history cleared. Installed copies are kept.';}})),this.#button('Keep shared installations',()=>{this.#confirm=false;this.#render();}));}else this.element.append(this.#button('Clear shared installations',()=>{this.#confirm=true;this.#render();}));}
   }
  }catch(e){this.element.append(note(e instanceof Error?e.message:'Installation reports unavailable.'));}
 }
}
