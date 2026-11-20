import {CloudError,type CloudClient} from './client';

export interface CalendarRecoverySource {readonly generation?:string|undefined;readonly required:boolean;readonly restored?:boolean|undefined;}
export interface CalendarReceipt {eventId:string;revision?:number;preferencesRevision?:number;rsvpRevision?:number;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
export class CalendarRecoveryError extends Error {constructor(){super('This event changed after recovery. Review the original action before starting another one.');}}
export function calendarRecoverySource(metadata:unknown):CalendarRecoverySource {
  if(!object(metadata))throw new CalendarRecoveryError();
  const flag=object(metadata.features)?metadata.features.calendarMutationRecoveryGeneration:undefined,r=metadata.directRecovery;
  if(flag!==undefined&&typeof flag!=='boolean'||r!==undefined&&(!object(r)||!generation(r.generation)||typeof r.restored!=='boolean')||flag===true&&!object(r))throw new CalendarRecoveryError();
  return Object.freeze({required:flag===true,generation:object(r)?r.generation as string:undefined,restored:object(r)?r.restored as boolean:undefined});
}
export function sameCalendarSource(a:CalendarRecoverySource,b:CalendarRecoverySource):boolean{return a.required===b.required&&a.generation===b.generation&&a.restored===b.restored;}
export function calendarReadAt(client:CloudClient,source:CalendarRecoverySource={required:false}) {
  const owner=client.memberNumber,origin=client.origin;
  return async <T>(path:string):Promise<T>=>{
    if(!client.connected||client.memberNumber!==owner||client.origin!==origin||source.required&&!generation(source.generation))throw new CalendarRecoveryError();
    const result=await client.request<T>('GET',path+(source.required?`${path.includes('?')?'&':'?'}recoveryGeneration=${source.generation}`:''));
    if(!client.connected||client.memberNumber!==owner||client.origin!==origin||source.required&&(!generation(source.generation)||!object(result)||result.recoveryGeneration!==source.generation))throw new CalendarRecoveryError();
    return result;
  };
}
export function calendarRead(client:CloudClient,metadata:unknown){
  const source=calendarRecoverySource(metadata);
  if(source.required&&(!client.origin||!object(metadata)||metadata.memberNumber!==client.memberNumber))throw new CalendarRecoveryError();
  return {source,request:calendarReadAt(client,source)};
}

const labels:Record<string,string>={title:'Title',description:'Description',language:'Language',category:'Category',room:'Place',tags:'Tags',agenda:'Outline',spaceId:'Linked Space',visibility:'Audience',startsAt:'Starts',endsAt:'Ends',capacity:'Places',state:'Attendance',saved:'Saved',reminderMinutes:'Reminder (minutes before)',reason:'Cancellation reason'};
/** Original domain values, without transport UUIDs or revision fields. */
export function calendarChangeText(body:Record<string,unknown>):string{
 return Object.entries(body).filter(([key])=>!['operationId','revision','eventRevision','communityId','recoveryGeneration'].includes(key)).map(([key,value])=>`${labels[key]??key}: ${['startsAt','endsAt'].includes(key)&&typeof value==='number'?new Date(value).toISOString():value===null?'None':typeof value==='boolean'?value?'Yes':'No':typeof value==='object'?JSON.stringify(value):String(value)}`).join('\n');
}

const outstanding=new WeakMap<CloudClient,Set<CalendarMutationIntent>>();
export function pendingCalendarChanges(client:CloudClient):CalendarMutationIntent[]{const entries=outstanding.get(client);if(!entries)return [];for(const intent of entries)if(!intent.identity())intent.release();return [...entries];}
export function clearCalendarChanges(client:CloudClient):void{for(const intent of outstanding.get(client)??[])intent.release();outstanding.delete(client);}
/** Volatile, account-owned original command. The UUID, form values, target,
 * revision and source are captured before preflight. A known ACK is never sent again. */
export class CalendarMutationIntent {
  readonly #owner:number;readonly #origin:string;readonly #body:Record<string,unknown>;
  readonly source:CalendarRecoverySource;readonly action:string;readonly eventId:string|undefined;
  #busy=false;#held=false;#released=false;#receipt:CalendarReceipt|undefined;notice='';
  constructor(readonly client:CloudClient,readonly method:'POST'|'PUT',readonly path:string,body:Record<string,unknown>,source:CalendarRecoverySource,readonly label='Event change'){
    this.#owner=client.memberNumber;this.#origin=client.origin;this.source=Object.freeze({...source});
    this.#body=structuredClone({...body,operationId:body.operationId??crypto.randomUUID()});
    if(typeof source.required!=='boolean'||source.generation!==undefined&&!generation(source.generation)||source.restored!==undefined&&typeof source.restored!=='boolean'||source.required&&(!generation(source.generation)||typeof source.restored!=='boolean'))throw new CalendarRecoveryError();
    const match=/^\/v1\/calendar\/events(?:\/([^/]+)(?:\/(cancel|rsvp|preferences))?)?$/u.exec(path);
    if(!match||method!==(match[1]?match[2]==='cancel'?'POST':'PUT':'POST'))throw new CalendarRecoveryError();
    const entries=outstanding.get(client)??new Set<CalendarMutationIntent>();entries.add(this);outstanding.set(client,entries);
    this.eventId=match[1];this.action=!this.eventId?'create':match[2]??'settings';
  }
  release():void{this.#released=true;outstanding.get(this.client)?.delete(this);}
  get active():boolean{return !this.#released&&this.identity();}
  get body():Record<string,unknown>{return structuredClone(this.#body);}
  get busy():boolean{return this.#busy;}
  get held():boolean{return this.#held;}
  get confirmed():boolean{return !!this.#receipt;}
  identity():boolean{return this.client.memberNumber===this.#owner&&this.client.origin===this.#origin;}
  hold():void{this.#held=true;this.notice=this.confirmed?'This change was confirmed, but the event changed afterwards. Its original details are kept for review.':'This event action needs review. Its original details are kept; discard it before starting a new action.';}
  observe(source:CalendarRecoverySource):void{if(!sameCalendarSource(source,this.source))this.hold();}
  #accept(value:unknown):CalendarReceipt {
    if(!object(value)||typeof value.eventId!=='string'||this.eventId&&value.eventId!==this.eventId)throw new CalendarRecoveryError();
    if(this.source.required){
      const field=this.action==='preferences'?'preferencesRevision':this.action==='rsvp'?'rsvpRevision':'revision';
      const allowed=['applied','action','eventId','operationId','recoveryGeneration',field,...this.action==='rsvp'?['requestedState']:[]];
      if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iu.test(value.eventId)||Object.keys(value).length!==allowed.length||Object.keys(value).some(k=>!allowed.includes(k))||value.applied!==true||value.action!==this.action||value.operationId!==this.#body.operationId||value.recoveryGeneration!==this.source.generation||this.action==='rsvp'&&value.requestedState!==this.#body.state||value[field]!== (this.action==='create'?1:Number(this.#body.revision)+1))throw new CalendarRecoveryError();
    }
    return structuredClone(value) as unknown as CalendarReceipt;
  }
  async send(current:()=>boolean):Promise<CalendarReceipt|undefined>{
    if(!this.active||!current()||this.busy)return;
    if(this.#receipt)return structuredClone(this.#receipt);
    if(this.held)return;
    this.#busy=true;
    try{
      if(!this.client.connected)throw new CloudError('cloud_temporarily_unavailable');
      const me=await this.client.request<unknown>('GET','/v1/me');
      if(!this.identity()||!object(me)||me.memberNumber!==undefined&&me.memberNumber!==this.#owner)throw new CalendarRecoveryError();
      if(!object(me.features)||me.features.eventsRsvp!==true)throw new CalendarRecoveryError();
      this.observe(calendarRecoverySource(me));
      if(this.held||this.source.required&&(!this.#origin||me.memberNumber!==this.#owner||!generation(this.source.generation))||this.source.restored&&!this.source.required)throw new CalendarRecoveryError();
      if(!current())return;
      if(!this.#receipt){
        const value=await this.client.request<unknown>(this.method,this.path,{...this.body,...this.source.required?{recoveryGeneration:this.source.generation}:{}});
        if(!this.active)return;
        this.#receipt=this.#accept(value);
      }
      if(!current()){this.notice='The change was confirmed after leaving this view. Refresh to review its result.';return;}
      if(this.held)return;
      this.notice='';return structuredClone(this.#receipt);
    }catch(error){
      if(this.identity()&&(error instanceof CalendarRecoveryError||error instanceof CloudError&&error.status>=400&&error.status<500&&![408,429].includes(error.status)))this.hold();
      else this.notice='The result is not confirmed. Retry the original action when connected, or explicitly discard it.';
      throw error;
    }finally{this.#busy=false;}
  }
}
