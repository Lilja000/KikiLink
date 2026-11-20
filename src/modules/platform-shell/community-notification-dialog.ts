import type { CloudClient } from '../../cloud/client';
import { CloudSyncQueue, syncErrorMessage } from '../../cloud/sync-queue';
import { communityNotificationMetadata, readCommunityNotifications, notificationModeLabel, type CommunityNotificationMode, type CommunityNotificationPreference } from '../../cloud/community-notifications';
import { sameOwnerSettingsSource, type OwnerSettingsSource } from '../../cloud/owner-settings-generation';
import { ContentDialog } from '../link-chat/content-dialog';
import { element } from '../../utils/dom';

interface Draft { value:CommunityNotificationPreference; source:OwnerSettingsSource; mode:CommunityNotificationMode }
/** The editor keeps an unsent draft; the shared queue owns every submitted request. */
export class CommunityNotificationDialog {
  readonly #dialog=new ContentDialog();
  readonly element=this.#dialog.element;
  readonly #owner:number; readonly #origin:string;
  #draft:Draft|undefined;#epoch=0;#active=false;#busy=false;#notice='';#held=false;
  constructor(readonly client:CloudClient,readonly queue:CloudSyncQueue,readonly options:{current():boolean;changed():void;openQueue():void}){
    this.#owner=client.memberNumber;this.#origin=client.origin;
    this.element.addEventListener('close',()=>{this.#active=false;this.#epoch++;});
  }
  #current(epoch=this.#epoch):boolean{return this.#active&&epoch===this.#epoch&&this.options.current()&&this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  async open(cid:string):Promise<void>{
    if(this.#busy||!this.options.current()||this.client.memberNumber!==this.#owner||this.client.origin!==this.#origin)return;
    const kept=this.#draft&&this.#draft.mode!==this.#draft.value.mode?this.#draft:undefined;
    if(kept)cid=kept.value.communityId;
    const epoch=++this.#epoch;this.#active=true;this.#notice=kept?'Your original draft is kept. Save or discard it before editing another preference.':'';
    this.#held=true;
    this.#dialog.show('Community notifications',element('p',{text:'Loading notification preference…'}));
    try{
      const source=await communityNotificationMetadata(this.client,()=>this.#current(epoch));
      const value=await readCommunityNotifications(this.client,cid,source,()=>this.#current(epoch));
      if(!this.#current(epoch))return;
      this.#draft=kept??{value,source,mode:value.mode};
      this.#held=!value.canWrite||!!kept&&!sameOwnerSettingsSource(kept.source,source);
      if(this.#held)this.#notice='This community or Cloud source changed. The original draft is kept; discard it to review current settings.';
      this.#render();
    }catch(error){if(this.#current(epoch)){this.#notice='Could not review this community preference. Reconnect or check your membership. Any original draft is kept.';this.#draft=kept;this.#render();}}
  }
  #button(text:string,run:()=>void,disabled=false):HTMLButtonElement{
    const epoch=this.#epoch;const b=element('button',{type:'button',className:'kl-text-button',text});b.disabled=disabled||this.#busy;
    b.addEventListener('click',()=>{if(b.isConnected&&!b.disabled&&this.#current(epoch))run();});return b;
  }
  #render():void{
    if(!this.#current())return;
    const d=this.#draft,body=element('div');
    if(this.#notice){const notice=element('p',{text:this.#notice});notice.setAttribute('role','status');body.append(notice);}
    if(d){
      body.append(element('h3',{text:d.value.communityName}),element('p',{className:'kl-setting-help',text:'Important only uses channel mentions. All activity includes other channel messages. Individual channel choices keep their priority; invitations and membership notices stay in Inbox.'}));
      const select=element('select',{ariaLabel:'Community notification preference'});
      for(const mode of ['important','all'] as const){const o=element('option',{text:notificationModeLabel(mode)});o.value=mode;select.append(o);}
      select.value=d.mode;select.disabled=this.#busy||this.#held;
      select.addEventListener('change',()=>{if(this.#current()&&this.#draft===d&&!select.disabled)d.mode=select.value as CommunityNotificationMode;});
      body.append(select,element('p',{className:'kl-setting-help',text:'Closing keeps an unsaved draft for this session. Submitted changes are kept in Settings → Cloud until confirmed or cancelled.'}),
        element('div',{className:'kl-setting-tool-buttons'},this.#button(this.#busy?'Saving…':'Save preference',()=>void this.#save(d),this.#held),
          this.#button('Discard draft and reload',()=>{const cid=d.value.communityId;this.#draft=undefined;void this.open(cid);}))) ;
    }
    body.append(this.#button('Open Cloud queue',()=>{this.hide();this.options.openQueue();}));
    this.#dialog.body.replaceChildren(body);
  }
  async #save(d:Draft):Promise<void>{
    if(this.#busy||this.#held||this.#draft!==d)return;
    const epoch=this.#epoch;this.#busy=true;this.#notice='';this.#render();
    try{
      await this.queue.write('Communities','PUT',{communityId:d.value.communityId,mode:d.mode,revision:d.value.revision},d.value,d.source);
      if(this.#draft===d)this.#draft=undefined;
      this.options.changed();if(this.#current(epoch))this.hide();
    }catch(error){if(this.#current(epoch))this.#notice=syncErrorMessage(error);}
    finally{this.#busy=false;if(this.#current(epoch))this.#render();}
  }
  hide():void{this.#active=false;this.#epoch++;this.#dialog.close();}
  destroy():void{this.hide();this.#draft=undefined;this.#dialog.destroy();}
}
