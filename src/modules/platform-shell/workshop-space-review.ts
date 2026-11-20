import {SpaceMutationIntent,spaceChangeText,spaceRead,spaceReadAt,pendingSpaceChanges,type SpaceRecoverySource} from '../../cloud/space-mutation-intent';
import {extendedRoomDraft} from '../../../cloud/shared/room-contract.mjs';
import { CloudError, type CloudClient } from '../../cloud/client';
import { element } from '../../cloud/dom';
import { workshopId, workshopNote as note, workshopPayloadView } from './workshop-model';
import type { InstalledWorkshopPackage } from './workshop-installation-model';
import type { PersistentSpace, SpaceRoom } from './spaces-page';
import { workshopPresetId, workshopSpaceBody } from './workshop-destinations-model';

/** Reuses the Space settings CAS/operation receipt; it never updates a native BC room. */
export class WorkshopSpaceReview {
  readonly element = element('section', { className: 'kl-workshop-space-review' });
  #token = 0; #busy = false; #selected: PersistentSpace | undefined;
  #source:SpaceRecoverySource={required:false};
  #pending: { intent?:SpaceMutationIntent; id: string; body: Record<string, unknown> } | undefined;
  #presetId = ''; #searchSpace: SpaceRoom['searchSpace'] = 'X';
  constructor(readonly client: CloudClient, readonly item: InstalledWorkshopPackage, readonly current: () => boolean, readonly options: { cancel(): void; openSpace(id: string): void }) { void this.load(); }
  #valid(token: number): boolean { return token === this.#token && this.current(); }
  #button(label: string, action: () => void): HTMLButtonElement {
    const button = element('button', { type: 'button', className: 'kl-text-button', text: label });
    button.addEventListener('click', () => { if (button.isConnected&&!button.disabled&&!this.#pending?.intent?.busy&&!this.#busy && this.current()) action(); }); return button;
  }
  #error(error: unknown): void { this.element.append(element('p', { role: 'alert', text: error instanceof CloudError && [401,403,404].includes(error.status) ? 'This Space is no longer available to manage.' : error instanceof Error ? error.message : 'The Space could not load.' })); }
  async load(): Promise<void> {
    if(this.#pending?.intent&&!this.#pending.intent.active)this.#pending=undefined;
    if(!this.#pending){const intent=pendingSpaceChanges(this.client)[0];if(intent)this.#pending={intent,id:intent.spaceId??'',body:intent.body};}
    if (this.#pending) {this.#drawPending();return;} const token = ++this.#token; this.#busy = true;
    this.element.replaceChildren(note('Loading Spaces you manage…'));
    try {
      const me=await this.client.request<{memberNumber:number;features?:{roomOpening?:boolean}}>('GET','/v1/me');if(!this.#valid(token))return;
      const read=spaceRead(this.client,me);this.#source=read.source;
      if(extendedRoomDraft(this.item.release)&&(me.memberNumber!==this.client.memberNumber||me.features?.roomOpening!==true))throw new Error('These saved room settings need the pending Cloud update. Your installed copy is kept.');
      this.#presetId = await workshopPresetId(this.client.origin, this.item.id, this.item.release.version);
      const spaces: PersistentSpace[] = [], seen = new Set<string>(); let cursor = 0, more = false;
      for (let page = 0; page < 10; page++) {
        const result = await read.request<{items: PersistentSpace[]; nextCursor: number | null}>( `/v1/spaces?scope=mine&limit=20&cursor=${cursor}`);
        if (!this.#valid(token)) return;
        if (!Array.isArray(result.items) || result.items.length > 20 || result.nextCursor !== null && (!Number.isSafeInteger(result.nextCursor) || result.nextCursor <= 0 || cursor > 0 && result.nextCursor >= cursor)) throw new Error('Invalid Space list.');
        for (const space of result.items) {
          if (!workshopId(space.id) || seen.has(space.id)) throw new Error('Invalid Space list.'); seen.add(space.id);
          if (space.canManage && space.canRead && !space.archived) spaces.push(space);
        }
        more = !!result.nextCursor; cursor = result.nextCursor ?? 0; if (!more) break;
      }
      this.#busy = false;
      this.element.replaceChildren(element('h3', {text: this.item.release.type === 'Room preset' ? 'Save a preset in a Space' : 'Apply a Space background'}), workshopPayloadView(this.item.release));
      if (!spaces.length) this.element.append(note('A Space you own or administer is required. Create or join one through Rooms → Spaces.'));
      else {
        const select = element('select', { ariaLabel: 'Space you manage' });
        select.append(element('option', {value:'',text:'Choose a Space…'}), ...spaces.map(space => element('option',{value:space.id,text:space.name})));
        select.addEventListener('change', () => { if (!this.#busy && this.current() && select.value) void this.select(select.value); }); this.element.append(select);
        if (more) this.element.append(note('Showing the first 200 Spaces. Open the desired Space from Rooms if it is not listed.'));
      }
      this.element.append(this.#button('Cancel application', this.options.cancel));
    } catch (error) { if (this.#valid(token)) { this.#busy = false; this.element.replaceChildren(this.#button('Refresh destinations', () => void this.load()),this.#button('Cancel application',this.options.cancel)); this.#error(error); } }
  }
  async select(id: string): Promise<void> {
    if(this.#pending)return;const token = ++this.#token; this.#busy = true;
    try {
      const space = await spaceReadAt(this.client,this.#source)<PersistentSpace>(`/v1/spaces/${id}`);space.recoverySource=this.#source;
      if (!this.#valid(token)) return;
      if (space.id !== id) throw new Error('The Space changed.');
      this.#searchSpace = space.room?.searchSpace ?? 'X';
      workshopSpaceBody(space, this.item, this.#presetId, this.#searchSpace);
      this.#selected = space; this.#busy = false; this.#draw();
    } catch (error) { if (this.#valid(token)) { this.#busy = false; this.#error(error); } }
  }
  #draw(): void {
    const space = this.#selected!;
    this.element.replaceChildren(element('h3', {text:`Review changes to ${space.name}`}),workshopPayloadView(this.item.release));
    if (this.item.release.type === 'Room preset') {
      this.element.append(note(`Adds one saved preset (${space.presets!.length}/8 used). The current linked room stays as it is. Review the preset in the Space’s Room tab before using it.`));
      const select = element('select', {ariaLabel:'BC room search space'});
      for (const [value,label] of [['X','Mixed'],['','Female'],['M','Male']] as const) select.append(element('option',{value,text:label}));
      select.value = this.#searchSpace; select.addEventListener('change', () => {if (!this.#busy) this.#searchSpace = select.value as SpaceRoom['searchSpace'];}); this.element.append(select);
    } else this.element.append(note(`Background: ${space.room!.background || 'None'} → ${this.item.release.payload.background}. Changes the Space room preview palette. Capacity, name, presets, membership and the live BC room stay as they are.`));
    this.element.append(this.#button(this.item.release.type === 'Room preset' ? 'Add saved preset' : 'Apply background', () => void this.save()), this.#button('Choose another Space', () => void this.load()), this.#button('Cancel application', this.options.cancel));
  }
  #drawPending(discard=false):void{
    const p=this.#pending;if(!p?.intent)return;const intent=p.intent;
    this.element.replaceChildren(element('h3',{text:'Unfinished Space change'}),note(intent.label),note(intent.notice||'The original action is kept until its result is confirmed.'));
    const values=element('textarea',{ariaLabel:'Original Space change'});values.readOnly=true;values.rows=6;values.value=spaceChangeText(p.body);this.element.append(values);
    if(!intent.held)this.element.append(this.#button(intent.confirmed?'Refresh confirmed Space change':'Retry Space save',()=>void this.save()));
    this.element.append(this.#button('Discard Space change',()=>this.#drawPending(true)));
    if(discard)this.element.append(note('Discard these original details? This does not undo a change that may already have reached the server.'),this.#button('Keep Space change',()=>this.#drawPending()),this.#button('Confirm discard',()=>{intent.release();this.#pending=undefined;void this.load();}));
  }
  async save(): Promise<void> {
    if (this.#busy || !this.current() || !this.#selected&&!this.#pending) return;
    const token = this.#token;
    try {
      if(!this.#pending){const other=pendingSpaceChanges(this.client)[0];if(other){this.#pending={intent:other,id:other.spaceId??'',body:other.body};this.#drawPending();return;}const space=this.#selected!,body=workshopSpaceBody(space,this.item,this.#presetId,this.#searchSpace),source=space.recoverySource??{required:false};this.#pending={id:space.id,body,...source.generation||source.required?{intent:new SpaceMutationIntent(this.client,'PUT',`/v1/spaces/${space.id}`,body,source,`${this.item.release.type==='Room preset'?'Add saved preset':'Apply background'} · ${space.name}`)}:{}};}
      this.#busy = true; for (const control of this.element.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button,select')) control.disabled = true;
      if(!this.#pending.intent&&extendedRoomDraft(this.item.release)){
        const me=await this.client.request<{memberNumber:number;features?:{roomOpening?:boolean}}>('GET','/v1/me');
        if(!this.#valid(token))return;
        if(me.memberNumber!==this.client.memberNumber||me.features?.roomOpening!==true)throw new Error('The pending Cloud update is required.');
      }
      const receipt=this.#pending.intent?await this.#pending.intent.send(()=>this.#valid(token)):await this.client.request<{spaceId:string;revision:number}>('PUT',`/v1/spaces/${this.#pending.id}`,this.#pending.body);
      if(!receipt||!this.#valid(token))return;
      if (!this.#pending.intent&&(receipt.spaceId !== this.#pending.id || !Number.isSafeInteger(receipt.revision) || Number(receipt.revision) <= Number(this.#pending.body.revision))) throw new Error('The save result could not be confirmed.');
      const bound=!!this.#pending.intent;this.#pending.intent?.release();this.#pending = undefined; this.#busy = false;
      this.element.replaceChildren(note(bound?'Space change confirmed. Open the Space to review its current details.':this.item.release.type === 'Room preset' ? 'Preset saved. Review it in the Space’s Room tab.' : 'Background saved to this Space.'),this.#button('Open Space',()=>this.options.openSpace(receipt.spaceId)),this.#button('Back to installed package',this.options.cancel));
    } catch (error) {
      if (!this.#valid(token)) return; this.#busy = false;
      if(this.#pending?.intent){this.#drawPending();return;}
      if (error instanceof CloudError && error.status >= 400 && error.status < 500 && error.status !== 408) {
        this.#pending = undefined; this.element.replaceChildren(this.#button('Refresh destinations',()=>void this.load()),this.#button('Cancel application',this.options.cancel)); this.#error(error);
      } else this.element.replaceChildren(note('The save result is uncertain. Retry the same operation to check it safely.'),this.#button('Retry Space save',()=>void this.save()),this.#button('Back to installed package',this.options.cancel));
    }finally{this.#busy=false;if(this.#pending?.intent&&this.current())this.#drawPending();}
  }
}
