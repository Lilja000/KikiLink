import type {WorkshopAutosaveStatus} from './workshop-autosave';
import type {WorkshopDraftState} from './workshop-drafts';
import {checkedCommunityTemplate} from '../../../cloud/shared/community-template.mjs';
import {checkedWorkshopDestination,WORKSHOP_DESTINATION_TYPES} from '../../core/workshop-destinations';
import { element } from '../../cloud/dom';
import { focusedElement } from '../../utils/dom';
import { kikiIcon, type KikiLinkIconName } from '../link-chat/icons';
import { fitPanelDialog } from './panel-dialog-layout';
import { checkedWorkshopDependencies, newWorkshopDraft, workshopNote as note, workshopPayloadView, workshopTypePreview, workshopVersion, type WorkshopDraft, type WorkshopSummary, type WorkshopType } from './workshop-model';
const styles=['classic','garden','midnight','glacier','sage','dusty-rose','amber','gradient'];
const motifs=['blossom','rose','starlight','laurel','thorn','moon','ribbon','wings','lotus','constellation','crest'];
const icons=['heart','moon','cup','brush','leaf','sparkles','clock','users','home','check'];
const typeIcons:Record<WorkshopType,KikiLinkIconName>={
  'Activity pack':'activities','Room preset':'door','Background':'image','Profile theme':'profile',
  'UI theme':'appearance','Status & emoji':'status','Community template':'users',
};
const editorSteps=['Details','Content & settings','Review'];

export class WorkshopEditor {
  readonly element=element('dialog',{className:'kl-workshop-editor'});
  readonly draft:WorkshopDraft;
  readonly #baseline:string;readonly #variants:WorkshopDraftState['variants'];
  readonly #autosaveStatus=element('div',{className:'kl-workshop-editor-autosave',role:'status',ariaLabel:'Local draft autosave'});
  readonly #notices=element('div',{className:'kl-workshop-editor-notices'});
  readonly #titleId=`kl-workshop-editor-${crypto.randomUUID()}`;
  #step=1;#searchGeneration=0;#changed=false;#busy=false;#cloudAvailable=true;
  constructor(draft:WorkshopDraft,readonly options:{fixedType:boolean;title?:string;state?:WorkshopDraftState;changed?(state:WorkshopDraftState):void;retryAutosave?():void;checkpoint?(state:WorkshopDraftState):Promise<void>;roomOpening?:boolean;roomThemes?:boolean;communityTemplates?:boolean;dependencies?:boolean;packageId?:string;searchDependencies?(query:string):Promise<WorkshopSummary[]>;save(draft:WorkshopDraft):void;cancel():void}){
    this.draft=structuredClone(draft);this.#baseline=JSON.stringify(draft);this.#variants=structuredClone(options.state?.variants??{});this.#step=options.state?.step??1;
    this.element.setAttribute('aria-labelledby',this.#titleId);
    this.#render();
    this.element.addEventListener('keydown',event=>event.stopPropagation());
    this.element.addEventListener('cancel',event=>{event.preventDefault();this.#requestClose(focusedElement(this.element));});
    this.element.addEventListener('click',event=>{
      if(event.target!==this.element)return;
      const bounds=this.element.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)this.#requestClose(focusedElement(this.element));
    });
  }
  show(status:HTMLElement):void {
    if(status.parentElement!==this.#notices)this.#notices.append(status);
    if(this.element.isConnected&&!this.element.open){this.element.showModal();fitPanelDialog(this.element);this.#focusStep();}
  }
  hide():void{if(this.element.open)this.element.close();}
  #focusStep():void{
    const field=this.element.querySelector<HTMLElement>('.kl-workshop-fields :is(input,textarea,select):not(:disabled)');
    (field??this.element.querySelector<HTMLElement>('.kl-workshop-editor-body'))?.focus({preventScroll:true});
  }
  snapshot():WorkshopDraftState{return{draft:structuredClone(this.draft),variants:structuredClone(this.#variants),step:this.#step};}
  cloudAvailable(value:boolean):void{this.#cloudAvailable=value;if(!value)this.#searchGeneration++;this.#cloudControls();}
  #cloudControls():void{for(const control of this.element.querySelectorAll<HTMLButtonElement>('[data-workshop-cloud]'))control.disabled=this.#busy||!this.#cloudAvailable;}
  autosaveStatus(value:WorkshopAutosaveStatus):void{this.#autosaveStatus.replaceChildren(note(value.message));if(value.state==='error'&&this.options.retryAutosave)this.#autosaveStatus.append(this.#button('Retry local save',this.options.retryAutosave));}
  #notify():void{this.options.changed?.(this.snapshot());}
  get dirty():boolean{return this.#changed||JSON.stringify(this.draft)!==this.#baseline;}
  busy(value:boolean):void {
    this.#busy=value;for(const control of this.element.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement|HTMLButtonElement>('input,textarea,select,button'))control.disabled=value;
    for(const type of this.element.querySelectorAll<HTMLButtonElement>('[data-workshop-type-choice]'))type.disabled=value||this.options.fixedType;
    this.#cloudControls();
  }
  #button(text:string,action:()=>void):HTMLButtonElement {
    const cloud=['Save draft','Find dependencies'].includes(text),button=element('button',{type:'button',className:'kl-text-button',text});if(cloud){button.dataset.workshopCloud='true';button.disabled=!this.#cloudAvailable;}button.addEventListener('click',()=>{if(this.element.contains(button)&&!this.#busy&&(!cloud||this.#cloudAvailable)){action();this.#notify();}});return button;
  }
  #field(label:string,value:string,maxLength:number,change:(value:string)=>void,multiline=false,help?:string):HTMLElement {
    const input=element(multiline?'textarea':'input',{ariaLabel:label,value,maxLength});
    const count=element('small',{className:'kl-workshop-editor-counter',ariaHidden:'true',text:`${value.length}/${maxLength}`});
    const hint=help?element('small',{className:'kl-workshop-editor-field-hint',text:help}):undefined;
    if(hint){hint.id=`${this.#titleId}-${label.toLowerCase().replaceAll(' ','-')}`;input.setAttribute('aria-describedby',hint.id);}
    input.addEventListener('input',()=>{if(!this.#busy){this.#changed=true;change(input.value);count.textContent=`${input.value.length}/${maxLength}`;this.#notify();}});
    return element('label',{className:multiline?'kl-workshop-editor-wide':''},element('span',{text:label}),input,hint,count);
  }
  #select(label:string,value:string,choices:readonly string[],change:(value:string)=>void):HTMLElement {
    const select=element('select',{ariaLabel:label});select.append(...choices.map(value=>element('option',{value,text:label==='Visibility'?value[0]!.toUpperCase()+value.slice(1):value})));select.value=value;select.addEventListener('change',()=>{if(!this.#busy){this.#changed=true;change(select.value);this.#notify();}});return element('label',{},element('span',{text:label}),select);
  }
  #typeChoices():HTMLElement {
    const draft=this.draft;
    const choices=element('div',{className:'kl-workshop-editor-types'});
    const types=(Object.keys(typeIcons) as WorkshopType[]).filter(type=>type===draft.type||
      (this.options.roomThemes||!(WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(type))&&
      (this.options.communityTemplates||type!=='Community template'));
    for(const type of types){
      const check=element('span',{className:'kl-workshop-editor-type-check',ariaHidden:'true'});
      const button=this.#button(type,()=>{
        if(this.options.fixedType||draft.type===type)return;
        this.#variants[draft.type]=structuredClone(draft.payload);
        draft.type=type;
        draft.payload=structuredClone(this.#variants[type]??newWorkshopDraft(type).payload);
        this.#changed=true;
        for(const choice of choices.querySelectorAll<HTMLButtonElement>('button')){
          const selected=choice===button;
          choice.setAttribute('aria-pressed',String(selected));
          choice.lastElementChild?.replaceChildren(...selected?[kikiIcon('check')]:[]);
        }
      });
      button.dataset.workshopTypeChoice=type;
      button.setAttribute('aria-pressed',String(draft.type===type));
      button.disabled=this.options.fixedType;
      button.replaceChildren(kikiIcon(typeIcons[type]),element('span',{text:type}),check);
      if(draft.type===type)check.append(kikiIcon('check'));
      choices.append(button);
    }
    return element('fieldset',{className:'kl-workshop-editor-type-field',ariaLabel:'Package type'},
      element('legend',{text:'Package type'}),choices,this.options.fixedType?note('The package type is fixed for this draft.'):undefined);
  }
  #requestClose(trigger?:HTMLElement):void {
    if(this.#busy)return;
    if(!this.dirty){this.options.cancel();return;}
    const alert=this.element.querySelector('.kl-workshop-editor-warning');
    if(!alert)return;
    const keep=this.#button('Keep editing',()=>{alert.replaceChildren();trigger?.focus({preventScroll:true});});
    const discard=this.#button('Discard unsaved changes',this.options.cancel);
    alert.replaceChildren(note(this.options.changed?'Discard changes not yet saved? Your latest local save will be kept in Local drafts.':'Discard these unsaved changes?'),
      element('div',{className:'kl-workshop-editor-warning-actions'},keep,discard));
    keep.focus({preventScroll:true});
  }
  #error():string {
    const draft=this.draft,p=draft.payload;
    try{checkedWorkshopDependencies(draft.deps);if(draft.deps?.some(dep=>dep.id===this.options.packageId))return'A package cannot depend on itself.';}catch(error){return(error as Error).message;}

    if((WORKSHOP_DESTINATION_TYPES as readonly string[]).includes(draft.type)){try{checkedWorkshopDestination(draft.type,p);}catch(error){return(error as Error).message;}}
    if(draft.type==='Community template'){try{checkedCommunityTemplate(p);}catch(error){return(error as Error).message;}}
    if(draft.title.trim().length<3)return'Use a title of at least 3 characters.';
    if(!workshopVersion(draft.version))return'Use a version such as 1.0.0 (each number from 0 to 999).';
    if(draft.tags.length>6||draft.tags.some(tag=>tag.length>24)||new Set(draft.tags.map(tag=>tag.toLowerCase())).size!==draft.tags.length)return'Use up to 6 different tags, each up to 24 characters.';
    if(draft.type==='Activity pack'&&(!p.activities?.length||p.activities.some(item=>!item.title.trim()||!item.text.trim())))return'Give every activity a title and text.';
    if(draft.type==='Status & emoji'&&(!((p.statuses?.length??0)+(p.emojis?.length??0))||p.statuses?.some(item=>!item.text.trim())||p.emojis?.some(item=>!item.label.trim()||!item.symbol.trim())))return'Add at least one status or labelled emoji and complete every row.';
    if(draft.type==='Profile theme'&&[p.gradient?.primary,p.gradient?.secondary,p.decoration?.primary,p.decoration?.secondary].some(color=>!/^#[a-f0-9]{6}$/i.test(color??'')))return'Use six-digit colours such as #d2a6ba.';
    return'';
  }
  #search():HTMLElement {
    const section=element('section',{className:'kl-workshop-dependency-search'});if(!this.options.searchDependencies)return section;
    const input=element('input',{ariaLabel:'Search dependencies',maxLength:80,placeholder:'Search published packages'}),status=element('div',{role:'status'});
    section.append(input,this.#button('Find dependencies',()=>{
      const generation=++this.#searchGeneration;status.replaceChildren(note('Searching published packages…'));
      void this.options.searchDependencies!(input.value.trim()).then(items=>{
        if(generation!==this.#searchGeneration)return;status.replaceChildren();const matches=items.filter(item=>item.id!==this.options.packageId&&!this.draft.deps?.some(dep=>dep.id===item.id));if(!matches.length)status.append(note('No matching public packages. You can also add an unlisted package by ID.'));
        for(const item of matches)status.append(element('article',{className:'kl-workshop-card'},element('strong',{text:item.title}),note(`${item.type} · ${item.version} · ${item.authorName}`),this.#button(`Use dependency: ${item.title}`,()=>{const deps=this.draft.deps??[];if(deps.length>=4||!item.version)return;this.draft.deps=[...deps,{id:item.id,minVersion:item.version}];this.#changed=true;this.#render();})));
      }).catch(()=>{if(generation===this.#searchGeneration)status.replaceChildren(note('Dependencies could not load. Try again.'));});
    }),status);return section;
  }
  #render():void {
    this.#searchGeneration++;
    const draft=this.draft,fields=element('div',{className:'kl-workshop-fields'}),alert=element('p',{className:'kl-workshop-editor-error',role:'alert'});
    const warning=element('div',{className:'kl-workshop-editor-warning',role:'alert'});
    const title=element('h2',{text:this.options.title??'Create a package'});
    title.id=this.#titleId;
    const close=this.#button('',()=>this.#requestClose(close));
    close.classList.add('kl-workshop-editor-close');
    close.setAttribute('aria-label','Close package editor');
    close.append(kikiIcon('close'));
    const progress=element('ol',{className:'kl-workshop-editor-steps',ariaLabel:'Package editor progress'});
    editorSteps.forEach((label,index)=>{
      const step=index+1,current=this.#step===step,done=this.#step>step;
      const item=element('li',{},element('span',{className:'kl-workshop-editor-step-marker',ariaHidden:'true'},done?kikiIcon('check'):String(step)),label);
      if(current)item.setAttribute('aria-current','step');
      if(done)item.dataset.complete='true';
      progress.append(item);
    });
    const body=element('div',{className:'kl-workshop-editor-body',tabIndex:-1},progress,this.#notices,
      fields,alert);
    const actions=element('footer',{className:'kl-workshop-editor-footer'});
    this.element.replaceChildren(
      element('header',{className:'kl-workshop-editor-header'},element('div',{},element('small',{text:'KIKILINK',ariaHidden:'true'}),title),close),
      body,warning,actions);
    if(this.#step===1){
      fields.append(
        this.#field('Title',draft.title,80,value=>{draft.title=value;}),
        this.#select('Visibility',draft.visibility,['public','unlisted'],value=>{draft.visibility=value as WorkshopDraft['visibility'];}),
        this.#field('Summary',draft.summary,180,value=>{draft.summary=value;},true),
        this.#typeChoices(),
        this.#field('Description',draft.description,1200,value=>{draft.description=value;},true),
        this.#field('Tags (comma separated)',draft.tags.join(', '),180,value=>{draft.tags=value.split(',').map(tag=>tag.trim()).filter(Boolean);}),
        note('Public releases appear in Browse. Unlisted releases are available by ID. Profile Creations follows your Activity privacy.'));
    }else if(this.#step===2){
      fields.append(element('h3',{text:`${draft.type} content`}));
      if(draft.type==='Activity pack'){
        fields.append(note('Plain activity text can use {me} and {target}. Publishing does not run an activity.'));
        draft.payload.activities!.forEach((item,index)=>{fields.append(element('fieldset',{},element('legend',{text:`Activity ${index+1}`}),this.#field(`Activity ${index+1} title`,item.title,64,value=>{item.title=value;}),this.#field(`Activity ${index+1} text`,item.text,240,value=>{item.text=value;},true),this.#select(`Activity ${index+1} target`,item.target,['Self','Other'],value=>{item.target=value as 'Self'|'Other';}),this.#button(`Remove activity ${index+1}`,()=>{draft.payload.activities!.splice(index,1);this.#changed=true;this.#render();})));});
        if(draft.payload.activities!.length<12)fields.append(this.#button('Add activity',()=>{draft.payload.activities!.push({id:crypto.randomUUID(),title:'',text:'',target:'Other'});this.#changed=true;this.#render();}));
      }else if(draft.type==='Profile theme'){
        const g=draft.payload.gradient!,d=draft.payload.decoration!,angles=[0,45,90,135,180,225,270,315].map(String);
        fields.append(this.#select('Profile style',draft.payload.profileStyle!,styles,value=>{draft.payload.profileStyle=value;}),this.#field('Gradient primary',g.primary,7,value=>{g.primary=value;}),this.#field('Gradient secondary',g.secondary,7,value=>{g.secondary=value;}),this.#select('Gradient angle',String(g.angle),angles,value=>{g.angle=Number(value);}),this.#select('Decoration mode',d.mode,['none','solid','gradient','preset'],value=>{d.mode=value;}),this.#select('Decoration motif',d.preset,motifs,value=>{d.preset=value;}),this.#field('Decoration primary',d.primary,7,value=>{d.primary=value;}),this.#field('Decoration secondary',d.secondary,7,value=>{d.secondary=value;}),this.#select('Decoration angle',String(d.angle),angles,value=>{d.angle=Number(value);}));
      }else if(draft.type==='Status & emoji'){
        draft.payload.statuses!.forEach((item,index)=>fields.append(element('fieldset',{},element('legend',{text:`Status ${index+1}`}),this.#field(`Status ${index+1} text`,item.text,80,value=>{item.text=value;}),this.#select(`Status ${index+1} icon`,item.icon,icons,value=>{item.icon=value;}),this.#button(`Remove status ${index+1}`,()=>{draft.payload.statuses!.splice(index,1);this.#changed=true;this.#render();}))));
        if(draft.payload.statuses!.length<12)fields.append(this.#button('Add status',()=>{draft.payload.statuses!.push({text:'',icon:'heart'});this.#changed=true;this.#render();}));
        draft.payload.emojis!.forEach((item,index)=>fields.append(element('fieldset',{},element('legend',{text:`Emoji ${index+1}`}),this.#field(`Emoji ${index+1} label`,item.label,32,value=>{item.label=value;}),this.#field(`Emoji ${index+1} symbol`,item.symbol,12,value=>{item.symbol=value;}),this.#button(`Remove emoji ${index+1}`,()=>{draft.payload.emojis!.splice(index,1);this.#changed=true;this.#render();}))));
        if(draft.payload.emojis!.length<12)fields.append(this.#button('Add emoji',()=>{draft.payload.emojis!.push({label:'',symbol:''});this.#changed=true;this.#render();}));
      }
      if(draft.type==='Community template'){
        const p=draft.payload;
        fields.append(this.#field('Template community name',p.name!,64,v=>p.name=v),this.#field('Template community description',p.description!,180,v=>p.description=v,true),this.#select('Template community access',p.visibility!,['Public','Request only','Private'],v=>p.visibility=v as 'Public'|'Request only'|'Private'),this.#field('Community tags (comma separated)',p.tags!.join(', '),76,v=>p.tags=v.split(',').map(t=>t.trim()).filter(Boolean)),this.#field('Template community rules',p.rules!.join('\n'),1447,v=>p.rules=v.split('\n').map(r=>r.trim()).filter(Boolean),true),note('Add 1–8 rules, one per line. Community tags use up to 3 labels of 24 characters.'));
        p.channels!.forEach((channel,i)=>fields.append(element('fieldset',{},element('legend',{text:`Channel ${i+1}`}),this.#field(`Template channel ${i+1} name`,channel.name,32,v=>channel.name=v),this.#field(`Template channel ${i+1} description`,channel.description,160,v=>channel.description=v,true),this.#button(`Remove template channel ${i+1}`,()=>{p.channels!.splice(i,1);this.#changed=true;this.#render();}))));
        if(p.channels!.length<8)fields.append(this.#button('Add template channel',()=>{p.channels!.push({name:'',description:''});this.#changed=true;this.#render();}));
        fields.append(note('Leave channels empty to start with a general channel. Create from template opens an editable community draft; the creator becomes its only initial member and owner.'));
      }
      if(draft.type==='Room preset'){
        const p=draft.payload;fields.append(this.#field('Room name',p.name!,64,value=>{p.name=value;}),this.#field('Room description',p.description!,400,value=>{p.description=value;},true),this.#field('Background name',p.background!,120,value=>{p.background=value;}),this.#select('Room capacity',String(p.capacity),Array.from({length:this.options.roomOpening?49:19},(_,i)=>String(i+2)),value=>{p.capacity=Number(value);}),note(this.options.roomOpening?'Saved plans support 2–50 places. Live BC capacity is checked when applying room settings.':'This Cloud supports room plans up to 20 places. The extended room settings need the pending update.'));
        if(this.options.roomOpening){const remember=element('input',{type:'checkbox',ariaLabel:'Remember room settings'});remember.checked=p.restoreOnOpen!==false;remember.addEventListener('change',()=>{if(!this.#busy){p.restoreOnOpen=remember.checked;this.#changed=true;this.#notify();}});fields.append(element('label',{},remember,element('span',{text:'Remember room settings'})),note('Choose saved settings by default when opening room setup. Fresh defaults and saved presets remain available; application is a separate action.'));}
      }else if(draft.type==='Background'){
        const p=draft.payload;fields.append(this.#field('Background name',p.background!,120,value=>{p.background=value;}),this.#field('Background primary',p.primary!,7,value=>{p.primary=value;}),this.#field('Background secondary',p.secondary!,7,value=>{p.secondary=value;}),note('A native background name and two colours for the Space room preview. No image URL or external download.'));
      }else if(draft.type==='UI theme'){
        const p=draft.payload;fields.append(this.#field('Panel primary',p.primary!,7,value=>{p.primary=value;}),this.#field('Panel secondary',p.secondary!,7,value=>{p.secondary=value;}),this.#field('Interface accent',p.accent!,7,value=>{p.accent=value;}),this.#select('Interface density',p.density!,['Compact','Comfortable'],value=>{p.density=value as 'Compact'|'Comfortable';}),note('Use dark panels and a visible accent. Application includes a separate review; the original palette can be restored in General settings.'));
      }
      fields.append(this.#field('Version',draft.version,11,value=>{draft.version=value;}),this.#field('Release notes',draft.changelog,600,value=>{draft.changelog=value;},true));
      if(this.options.dependencies){
        const deps=draft.deps??[];fields.append(element('h3',{text:'Dependencies'}),note('Add up to 4 published package IDs and the minimum version needed. Availability and cycles are checked when publishing. Every dependency and permission is reviewed at installation.'),this.#search());
        deps.forEach((dep,index)=>fields.append(element('fieldset',{},element('legend',{text:`Dependency ${index+1}`}),this.#field(`Dependency ${index+1} package ID`,dep.id,36,value=>{dep.id=value;}),this.#field(`Dependency ${index+1} minimum version`,dep.minVersion,11,value=>{dep.minVersion=value;}),this.#button(`Remove dependency ${index+1}`,()=>{draft.deps=deps.filter((_value,n)=>n!==index);this.#changed=true;this.#render();}))));
        if(deps.length<4)fields.append(this.#button('Add dependency',()=>{draft.deps=[...deps,{id:'',minVersion:'1.0.0'}];this.#changed=true;this.#render();}));
      }else fields.append(note('Dependency editing becomes available after the pending Cloud update.'));
    }else fields.append(
      element('article',{className:'kl-workshop-editor-review'},
        element('div',{className:'kl-workshop-editor-review-head'},workshopTypePreview(draft.type),
          element('div',{},element('h3',{text:draft.title}),note(`${draft.type} · v${draft.version}`)),
          element('span',{className:'kl-workshop-badge',text:draft.visibility==='public'?'Public':'Unlisted'})),
        ...[draft.summary,draft.description,draft.tags.join(' · ')].filter(Boolean).map(note)),
      workshopPayloadView(draft),...(draft.changelog?[note(`Release notes: ${draft.changelog}`)]:[]),
      note('Save this private draft, then review and publish it from the package page.'));
    const cancel=this.#button('Cancel editing',()=>this.#requestClose(cancel));
    if(this.#step>1){
      const back=this.#button('Back',()=>{this.#step--;this.#render();this.#focusStep();});
      back.prepend(kikiIcon('back'));
      actions.append(back);
    }else actions.append(cancel);
    if(this.options.checkpoint)actions.append(this.#button('Save on this device',()=>{const state=this.snapshot();this.busy(true);void this.options.checkpoint!(state).catch(error=>{this.busy(false);alert.textContent=error instanceof Error?error.message:'Could not save the local draft.';});}));
    actions.append(this.#autosaveStatus,element('span',{className:'kl-workshop-editor-count',text:`Step ${this.#step} of 3`}));
    const next=this.#step<3?this.#button('Next',()=>{
      const error=this.#step===2?this.#error():'';
      if(error){alert.textContent=error;alert.scrollIntoView({block:'nearest'});return;}
      this.#step++;
      this.#render();
      this.#focusStep();
    }):this.#button('Save draft',()=>{
      const error=this.#error();
      if(error){alert.textContent=error;alert.scrollIntoView({block:'nearest'});}
      else this.options.save(structuredClone(draft));
    });
    next.classList.add('kl-workshop-editor-primary');
    if(this.#step<3)next.append(kikiIcon('arrow-right'));
    actions.append(next);
  }
}
