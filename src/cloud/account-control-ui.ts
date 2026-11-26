import {AccountControlIntent,AccountControlGenerationError,AccountControlUnconfirmedError,accountControlRead,accountControlPath,reviewAccountControl} from './account-control-generation';
import type {SocialUI} from './social-ui';
/** The confirmation itself is the fresh, explicit review of a stable BC member number. */
export async function confirmCloudBlock(ui:SocialUI,anchor:HTMLElement,member:number,valid:()=>boolean,done:()=>void|Promise<void>,opener=ui.confirmationOpener(anchor)):Promise<void>{
 if(!anchor.isConnected||!valid())return;
 const review=await reviewAccountControl(ui.options.client,()=>anchor.isConnected&&valid());
 // Bind the private block inventory to the same source before presenting a confirmation.
 const blocks=accountControlRead<{items:Array<{memberNumber:number}>}>(await ui.options.client.request('GET',accountControlPath('/v1/blocks',review)),review);
 if(!anchor.isConnected||!valid())return;
 if(!Array.isArray(blocks?.items)||blocks.items.some(x=>!Number.isSafeInteger(x?.memberNumber)||x.memberNumber<1))throw new Error('Invalid block list');
 const intent=new AccountControlIntent(ui.options.client,review,{action:'block',member});let box:HTMLElement|undefined;
 const feedback=document.createElement('p');feedback.setAttribute('role','alert');feedback.hidden=true;
 const current=()=>!!box?.isConnected&&anchor.isConnected&&valid();
 box=ui.confirm(anchor,`Block Member #${member}'s Cloud profile and content?`,async()=>{
  if(!current())return;
  feedback.hidden=true;feedback.textContent='';
  try{await intent.run(current);}catch(error){
   if(!current()||ui.options.client.memberNumber!==review.owner||ui.options.client.origin!==review.origin)return;
   feedback.textContent=error instanceof AccountControlGenerationError||error instanceof AccountControlUnconfirmedError?error.message:'Block could not be confirmed. Close this action and review current account details before choosing again.';
   feedback.hidden=false;feedback.scrollIntoView?.({block:'nearest'});
   throw error;
  }
  if(!current()||ui.options.client.memberNumber!==review.owner||ui.options.client.origin!==review.origin)return;
  await done();ui.options.client.rememberBlock?.(member,true);
 },'Block',opener);box?.append(feedback);
}
