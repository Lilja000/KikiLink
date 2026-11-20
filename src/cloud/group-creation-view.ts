import {element} from './dom';
import {GroupCreationDraft,type GroupCreationDestination} from './group-creation-intent';
import type {PeoplePickerRequest} from '../modules/link-chat/people-picker';

export function groupCreationView(options:{draft:GroupCreationDraft;current():boolean;isBlocked(n:number):boolean;
  open(destination:GroupCreationDestination):Promise<void>;discard():Promise<void>;choosePeople?:(request:PeoplePickerRequest)=>void}):HTMLElement {
  const root=element('section',{className:'kl-group-creation-editor',ariaLabel:'New group request'}),d=options.draft;
  let error='',discard=false,picker=0,revision=0;
  const current=()=>root.isConnected&&options.current()&&d.identity();
  const run=async(action:()=>Promise<void>)=>{
    if(!current()||d.busy)return;
    error='';const task=action();render();
    try{await task;}catch(e){if(current())error=e instanceof Error?e.message:'Could not finish this group request.';}
    finally{if(current())render();}
  };
  const button=(label:string,action:()=>Promise<void>,disabled=false)=>{
    const b=element('button',{type:'button',className:'kl-text-button',text:label});b.disabled=d.busy||disabled;
    const token=revision;b.addEventListener('click',()=>{if(token===revision)void run(action);});return b;
  };
  const submit=async()=>{const result=await d.send(current,options.isBlocked);if(result&&current())await options.open(result);};
  const render=()=>{
    revision++;root.replaceChildren();if(!d.identity())return;
    root.append(element('h3',{text:'Start a group chat'}));
    const title=element('input',{type:'text',value:d.title,maxLength:60}),members=element('input',{type:'text',value:d.members,maxLength:90});
    title.readOnly=members.readOnly=!!d.pending||d.held||!!d.confirmed;
    const token=revision;
    const edit=()=>{if(current()&&token===revision)d.edit(title.value,members.value);};
    title.addEventListener('input',edit);members.addEventListener('input',edit);
    root.append(element('label',{className:'kl-cloud-field'},'Group name',title));
    const memberLabel=element('label',{className:'kl-cloud-field'},'Invite 2–4 verified Member Numbers, separated by commas',members);
    memberLabel.hidden=!!options.choosePeople&&!d.pending&&!d.held&&!d.confirmed;root.append(memberLabel);
    if(d.notice)root.append(element('p',{role:'status',text:d.notice}));
    if(error&&error!==d.notice)root.append(element('p',{role:'alert',text:error}));
    if(d.confirmed){
      root.append(element('p',{className:'kl-cloud-note',text:'Created group: '+d.confirmed.groupId}),button('Open created group',()=>options.open(d.confirmed!),d.held));
    }else if(d.pending)root.append(button('Retry group creation',submit,d.held));
    else root.append(button('Create and invite',async()=>{
      if(options.choosePeople){
        const chosen=++picker,originalTitle=d.title;
        options.choosePeople({mode:'Create group',minimum:2,maximum:4,groupTitle:originalTitle,confirm:async(values,title)=>{
          if(!current()||chosen!==picker||d.pending||d.held)return;
          if(!d.edit(title??originalTitle,values.join(', ')))return;
          await run(submit);
        }});
      }else await submit();
    },d.held));
    if(d.dirty||d.pending||d.confirmed){
      if(discard)root.append(element('p',{text:'A group may already exist. Discarding removes only this editor and does not undo invitations.'}),
        button('Discard',options.discard),button('Keep request',async()=>{discard=false;}));
      else root.append(button('Discard group draft',async()=>{discard=true;}));
    }
    root.append(element('p',{className:'kl-cloud-note',text:'Invited people accept with their verified Cloud identity. BC friendships and room locations are not required. Messages are retained for 30 days (up to 5,000 per group).'}));
  };
  render();return root;
}
