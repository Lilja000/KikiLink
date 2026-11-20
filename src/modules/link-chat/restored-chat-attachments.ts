import { archivedChatAttachments } from '../../core/chat-attachments';
import { element } from '../../utils/dom';
export function renderRestoredChatAttachments(value:unknown,options:{current:()=>boolean;image:(id:string)=>HTMLElement;audio:(id:string)=>HTMLElement}):HTMLElement|undefined {
 const refs=archivedChatAttachments(value);if(!refs)return;
 const region=element('section',{className:'kl-message-media',ariaLabel:'Restored chat attachments'});
 region.append(element('p',{className:'kl-setting-help',text:'Restored references. Files are requested from Cloud only when you open them; unavailable files stay unavailable.'}));
 for(const [kind,ids]of [['image',refs.images],['audio',refs.audio]] as const)for(const [i,id]of ids.entries()){
  const slot=element('div'),button=element('button',{type:'button',className:'kl-text-button',text:`Open restored ${kind} ${i+1}`});
  button.addEventListener('click',()=>{if(!region.isConnected||region.closest('[hidden]')||!options.current()||button.disabled)return;button.disabled=true;
   try{slot.replaceChildren(options[kind](id));}catch{button.disabled=false;const status=element('span',{text:'The attachment is unavailable. Try opening it again.'});status.setAttribute('role','status');slot.replaceChildren(button,status);}
  });slot.append(button);region.append(slot);
 }
 return region;
}
