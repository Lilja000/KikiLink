import type {ReportSource} from '../../cloud/report-source';
import type {CloudClient} from '../../cloud/client';
import {element} from '../../cloud/dom';
import {moderationDialog} from '../../cloud/moderation-dialog';
import {reportForm} from '../../cloud/report-form';

export class WorkshopReportDialog {
 readonly element:HTMLDialogElement;
 #disposed=false;#state={busy:false,pending:false,dirty:false};
 readonly #member:number;
 constructor(readonly client:CloudClient,type:'creation'|'review',id:string,title:string,sourceKey:string,readonly options:{source?:ReportSource|undefined;current():boolean;done(id?:number):void}) {
  this.#member=client.memberNumber;
  const body=element('div',{className:'kl-mod-dialog-body'});
  const footer=element('footer',{className:'kl-mod-dialog-footer'});
  const discard=element('section',{className:'kl-mod-notice',hidden:true});
  const finish=(id?:number)=>{if(!this.#current())return;this.destroy();options.done(id);};
  const button=(label:string,run:()=>void)=>{const b=element('button',{type:'button',className:'kl-text-button',text:label});b.addEventListener('click',()=>{if(this.#current()&&!this.#state.busy)run();});return b;};
  const cancel=()=>{
   if(!this.#current()||this.#state.busy)return;
   if(!this.#state.dirty&&!this.#state.pending){finish();return;}
   const keepEditing=button('Keep editing',()=>{discard.hidden=true;body.querySelector('textarea')?.focus();});
   const notice=this.#state.pending?'Your report may already have been received. Close without retrying?':'Discard this report draft?';
   discard.replaceChildren(element('p',{text:notice}),keepEditing,button('Discard report',()=>finish()));
   discard.hidden=false;
   keepEditing.focus();
  };
  const form=reportForm(client,type,id,true,report=>finish(report),cancel,'/v1/reports',{source:options.source,compact:true,sourceKey,current:()=>this.#current(),state:state=>{this.#state=state;this.element?.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')?.toggleAttribute('disabled',state.busy);}});
  footer.append(form.querySelector('.kl-cloud-actions')!);
  body.append(element('div',{className:'kl-mod-report-target'},element('span',{className:'kl-mod-badge',text:type==='creation'?'Creation':'Review'}),element('strong',{text:title})),
    form,element('p',{className:'kl-mod-note',text:'Platform moderators receive your reason and an encrypted snapshot of this published content. Private drafts are not included. Reports are retained for 30 days.'}),discard);
  this.element=moderationDialog(type==='creation'?'Report creation':'Report review',body,footer,cancel);
  this.element.classList.add('kl-mod-report-dialog','kl-workshop-report-dialog');
 }
 #current():boolean{return !this.#disposed&&this.element.isConnected&&this.client.connected&&this.client.memberNumber===this.#member&&this.options.current();}
 destroy():void{this.#disposed=true;if(this.element.open)this.element.close();this.element.remove();}
}
