import type {BCRoomCreationDraft} from '../../bc/room-creation';
import {roomOptions} from '../../bc/room-options';
import {element} from '../../utils/dom';
import type {SpaceRoom} from './spaces-page';

/** Edits here are disposable native settings; they never overwrite the saved Space. */
export class SpaceRoomCreationReview {
  readonly element = element('section',{className:'kl-sp-room-creation'});
  constructor(plan: SpaceRoom, options: {current():boolean; cancel():void; create(draft:BCRoomCreationDraft):Promise<void>}) {
    const draft:BCRoomCreationDraft={name:plan.name,description:plan.description??'',background:plan.background,capacity:plan.capacity,
      searchSpace:plan.searchSpace,language:'EN',access:'private',visibility:'unlisted'};
    let busy=false, done=false;
    const fields=element('fieldset',{className:'kl-sp-form'}), status=element('p');status.setAttribute('role','status');
    const field=(label:string,control:HTMLElement)=>element('label',{},element('span',{text:label}),control);
    const input=(label:string,value:string,max:number,write:(v:string)=>void,multiline=false)=>{
      const control=multiline?element('textarea',{className:'kl-input',ariaLabel:label}):element('input',{className:'kl-input',ariaLabel:label});
      control.value=value;control.maxLength=max;control.addEventListener('input',()=>{if(!busy&&!done)write(control.value);});return field(label,control);
    };
    const select=(label:string,choices:Array<[string,string]>,value:string,write:(v:string)=>void)=>{
      const control=element('select',{className:'kl-select',ariaLabel:label});
      for(const[v,text]of choices){const option=element('option',{text});option.value=v;control.append(option);}control.value=value;
      control.addEventListener('change',()=>{if(!busy&&!done)write(control.value);});return field(label,control);
    };
    const capacity=element('input',{className:'kl-input',ariaLabel:'New BC room capacity'});capacity.type='number';capacity.min='2';capacity.max='50';capacity.step='1';capacity.value=String(draft.capacity);
    capacity.addEventListener('input',()=>{if(!busy&&!done)draft.capacity=Number(capacity.value);});
    fields.append(input('New BC room name',draft.name,80,v=>draft.name=v),input('New BC room description',draft.description,400,v=>draft.description=v,true),
      input('New BC room background',draft.background,120,v=>draft.background=v),field('Places',capacity),
      select('New BC room search space',[['','Female'],['X','Mixed'],['M','Male']],draft.searchSpace,v=>draft.searchSpace=v as BCRoomCreationDraft['searchSpace']),
      select('New BC room language',roomOptions().languages.map(c=>[c.value,c.label]),draft.language,v=>draft.language=v),
      select('New BC room access',[['private','Administrators only'],['public','Everyone']],draft.access,v=>draft.access=v as BCRoomCreationDraft['access']),
      select('New BC room visibility',[['unlisted','Unlisted'],['public','Listed in BC search']],draft.visibility,v=>draft.visibility=v as BCRoomCreationDraft['visibility']));
    const create=element('button',{className:'kl-text-button kl-text-button--primary',type:'button',text:'Create BC room'});
    create.addEventListener('click',()=>{
      if(busy||done||!options.current())return;busy=true;fields.disabled=true;create.disabled=true;status.textContent='Waiting for BC to create and load the room…';
      void options.create(structuredClone(draft)).then(()=>{if(options.current()){done=true;status.textContent='BC room created and settings confirmed.';}})
        .catch(e=>{if(options.current())status.textContent=e instanceof Error?e.message:'Room creation could not be confirmed. Check BC before trying again.';})
        .finally(()=>{busy=false;if(options.current()){fields.disabled=done;create.disabled=done;}});
    });
    this.element.append(element('h2',{text:'Create a BC room'}),
      element('p',{text:'Leave your current BC room first. BC checks whether this name is available; a missing search result does not prove that it is free.'}),fields,
      element('p',{text:'You will be the only administrator. Your BC automatic ban lists apply. Space membership does not grant native room access. This starts a classic room without a game or custom media.'}),
      element('p',{text:'Saved plans support 2–50 places. BC validates the chosen capacity before sending. Changes here leave your saved Space settings intact.'}),status,
      element('div',{className:'kl-sp-actions'},element('button',{className:'kl-text-button',type:'button',text:'Close creation review',onClick:options.cancel}),create),
      element('p',{text:'Closing this review does not cancel a creation request already sent to BC.'}));
  }
}
