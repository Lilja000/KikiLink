import {WorkshopDrafts,type LocalWorkshopDraft,type WorkshopDraftState} from './workshop-drafts';

export type WorkshopAutosaveStatus={state:'idle'|'saving'|'saved'|'error';message:string};

/** One editor's serialized, compare-and-swap local saves. Never sends a Cloud request. */
export class WorkshopAutosave {
  #latest:LocalWorkshopDraft|undefined;
  #expected:string|null;
  #running:Promise<void>|undefined;
  #timer:ReturnType<typeof setTimeout>|undefined;
  #deadline:ReturnType<typeof setTimeout>|undefined;
  #stopped=false;
  #failed=false;
  constructor(readonly drafts:WorkshopDrafts,readonly options:{
    id:string;context:LocalWorkshopDraft['context'];initial?:LocalWorkshopDraft;
    current():boolean;status(value:WorkshopAutosaveStatus):void;committed(value:LocalWorkshopDraft):void;
  }){this.#expected=options.initial?JSON.stringify(options.initial):null;}
  get unsaved():boolean{return !!this.#running||!!this.#latest&&JSON.stringify(this.#latest)!==this.#expected;}
  flushPending():void{if(!this.#failed&&this.unsaved)void this.flush().catch(()=>{});}
  changed(state:WorkshopDraftState):void {
    if(this.#stopped)return;
    const next={id:this.options.id,context:structuredClone(this.options.context),...structuredClone(state)};
    if(JSON.stringify(next)===JSON.stringify(this.#latest))return;
    this.#latest=next;
    if(!this.unsaved){this.#clearTimers();this.#failed=false;this.options.status({state:'saved',message:'Saved on this device.'});return;}
    if(this.#failed)return; // Retry is explicit; a conflict never silently rebases.
    this.options.status({state:'saving',message:'Saving on this device…'});
    clearTimeout(this.#timer);this.#timer=setTimeout(()=>void this.flush().catch(()=>{}),400);
    this.#deadline??=setTimeout(()=>void this.flush().catch(()=>{}),2000);
  }
  flush(state?:WorkshopDraftState):Promise<void>{
    if(state)this.changed(state);
    this.#clearTimers();
    if(this.#stopped)return Promise.reject(new Error('This editor closed.'));
    if(this.#running)return this.#running;
    this.#failed=false;
    this.#running=this.#drain().finally(()=>{this.#running=undefined;});
    return this.#running;
  }
  async #drain():Promise<void>{
    try{
      while(this.#latest&&JSON.stringify(this.#latest)!==this.#expected){
        if(this.#stopped||!this.options.current())throw new Error('Your account or editor changed.');
        const value=structuredClone(this.#latest);
        this.options.status({state:'saving',message:'Saving on this device…'});
        await this.drafts.put(value,value.id,this.#expected,()=>!this.#stopped&&this.options.current());
        if(this.#stopped||!this.options.current())return;
        this.#expected=JSON.stringify(value);this.options.committed(value);
      }
      if(!this.#stopped&&this.options.current()&&this.#expected!==null)this.options.status({state:'saved',message:'Saved on this device.'});
    }catch(error){
      this.#failed=true;this.#clearTimers();
      if(!this.#stopped&&this.options.current())this.options.status({state:'error',message:`Local autosave paused. ${error instanceof Error?error.message:'The save could not be confirmed.'} Keep this editor open to retain unsaved changes.`});
      throw error;
    }
  }
  #clearTimers():void{clearTimeout(this.#timer);clearTimeout(this.#deadline);this.#timer=undefined;this.#deadline=undefined;}
  dispose():void{this.#stopped=true;this.#clearTimers();}
}
