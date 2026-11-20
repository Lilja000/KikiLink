import type {KeyValueStorage} from '../../core/settings';
import type {CloudClient} from '../../cloud/client';
import {observeSafetyActivity,type SafetyEvent} from '../../cloud/safety-activity-events';
import {AccountActivity,ACCOUNT_ACTIONS,type AccountAction,type AccountActivityEntry,type AccountActivityKind} from './account-activity';

type Client=Pick<CloudClient,'memberNumber'|'origin'|'connected'|'request'>;
interface State {version:2;owner:number;origin:string;entries:AccountActivityEntry[];seen:string[];}
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
const safety=(action:AccountAction)=>['Report','Moderation'].includes(ACCOUNT_ACTIONS[action][0]);

/** New origin-bound store; the old v1 journal is imported without changing its bytes.
 * Protected rows are never pruned by reads, a different filter, or a full store. */
export class SafetyActivity extends AccountActivity {
  readonly key:string;readonly origin:string;readonly #store:KeyValueStorage|undefined;
  readonly #stop:()=>void;
  #state:State;#raw:string|null=null;#failed=false;#closed=false;
  #accessEpoch=0;#expires=0;#source='';#platform=false;#scopes=new Map<string,boolean>();
  constructor(readonly client:Client,storage?:KeyValueStorage,now=Date.now){
    super(client.memberNumber,undefined,now);this.origin=client.origin;this.#store=storage;
    this.key=`kikilink:account-activity:${this.owner}:${encodeURIComponent(this.origin)}:v2`;
    this.#state={version:2,owner:this.owner,origin:this.origin,entries:[],seen:[]};
    try{this.#load();}catch{this.#failed=true;}
    this.#stop=observeSafetyActivity(client,event=>this.#recordConfirmed(event));
  }
  override get volatile():boolean{return this.#failed||!this.#store;}
  #identity():boolean{return !this.#closed&&this.client.memberNumber===this.owner&&this.client.origin===this.origin;}
  #load():void{
    if(!this.#identity())throw new Error('Activity unavailable');
    if(!this.#store)return;
    const r=this.#store.getItemResult?.(this.key);if(r&&!r.ok)throw new Error('Activity could not be read');
    const raw=r?r.value:this.#store.getItem(this.key);let state:State;
    if(raw===null){
      const legacyKey=`kikilink:account-activity:${this.owner}:v1`,legacy=this.#store.getItemResult?.(legacyKey);
      if(legacy&&!legacy.ok)throw new Error('Original activity could not be read');
      const old=legacy?legacy.value:this.#store.getItem(legacyKey);let entries:AccountActivityEntry[]=[];
      if(old&&old.length>40_000)throw new Error('Invalid original activity');
      if(old){const v=JSON.parse(old);if(v.version!==1||v.owner!==this.owner||!Array.isArray(v.entries)||v.entries.length>100)throw new Error('Invalid original activity');
        entries=v.entries.map((e:AccountActivityEntry)=>{if(!e||!uuid(e.id)||!Object.hasOwn(ACCOUNT_ACTIONS,e.action)||safety(e.action)||!Number.isSafeInteger(e.time))throw new Error('Invalid original entry');return{id:e.id,action:e.action,time:e.time};});}
      state={version:2,owner:this.owner,origin:this.origin,entries,seen:[]};
    }else{
      if(raw.length>500_000)throw new Error('Activity is full');state=JSON.parse(raw);
      if(!state||Object.keys(state).sort().join(',')!=='entries,origin,owner,seen,version'||state.version!==2||state.owner!==this.owner||state.origin!==this.origin||!Array.isArray(state.entries)||state.entries.length>1000||!Array.isArray(state.seen)||state.seen.length>2000||state.seen.some(x=>!digest(x))||new Set(state.seen).size!==state.seen.length)throw new Error('Invalid activity');
      const ids=new Set<string>();
      for(const e of state.entries){
        if(!e||!Object.hasOwn(ACCOUNT_ACTIONS,e.action)||!Number.isSafeInteger(e.time)||e.time<0||ids.has(e.id))throw new Error('Invalid entry');ids.add(e.id);
        if(safety(e.action)){
          if(Object.keys(e).sort().join(',')!=='action,generation,id,scope,time'||!digest(e.id)||!generation(e.generation)||e.scope!=='platform'&&!uuid(e.scope)||!state.seen.includes(e.id))throw new Error('Invalid safety entry');
        }else if(Object.keys(e).sort().join(',')!=='action,id,time'||!uuid(e.id))throw new Error('Invalid entry');
      }
    }
    this.#state=state;this.#raw=raw;
  }
  #commit(state:State):void{
    if(!this.#identity()||state.entries.length>1000||state.seen.length>2000)throw new Error('Activity changed or is full');
    const raw=JSON.stringify(state);if(raw.length>500_000)throw new Error('Activity is full');
    if(!this.#store){this.#state=state;this.#failed=true;return;}
    if(this.#store.getItem(this.key)!==this.#raw)throw new Error('Activity changed');
    this.#store.setItem(this.key,raw);if(this.#store.getItem(this.key)!==raw)throw new Error('Activity could not be saved');
    this.#state=state;this.#raw=raw;this.#failed=false;
  }
  override record(action:AccountAction):void{
    if(!Object.hasOwn(ACCOUNT_ACTIONS,action)||safety(action))return;
    try{this.#load();this.#commit({...this.#state,entries:[...this.#state.entries,{id:crypto.randomUUID(),action,time:this.now()}]});}catch{this.#failed=true;}
  }
  #recordConfirmed(event:SafetyEvent):void{
    try{this.#load();if(this.#state.seen.includes(event.id))return;
      if(this.#source&&event.generation!==this.#source)this.invalidateAccess();
      this.#commit({...this.#state,entries:[...this.#state.entries,{...event,time:this.now()}],seen:[...this.#state.seen,event.id]});
    }catch{this.#failed=true;}
  }
  invalidateAccess():void{this.#accessEpoch++;this.#expires=0;this.#source='';this.#platform=false;this.#scopes.clear();}
  async refreshAccess(valid=()=>true):Promise<boolean>{
    this.invalidateAccess();const epoch=this.#accessEpoch,current=()=>this.#identity()&&this.client.connected&&epoch===this.#accessEpoch&&valid();
    try{
      this.#load();if(!current())return false;
      const me=await this.client.request<{memberNumber:number;features?:{localSafetyActivity?:boolean};directRecovery?:{generation:string}}>('GET','/v1/me');
      if(!current()||me.memberNumber!==this.owner||me.features?.localSafetyActivity!==true||!generation(me.directRecovery?.generation))return false;
      const source=me.directRecovery!.generation,ids=[...new Set(this.#state.entries.filter(e=>ACCOUNT_ACTIONS[e.action][0]==='Moderation'&&e.generation===source&&e.scope!=='platform').map(e=>e.scope!))];
      const scopes=new Map<string,boolean>();let platform=false;
      for(let offset=0;offset<Math.max(1,ids.length);offset+=100){
        const batch=ids.slice(offset,offset+100),q=new URLSearchParams({recoveryGeneration:source,communities:batch.join(',')});
        const v=await this.client.request<{memberNumber:number;platform:boolean;recoveryGeneration:string;items:Array<{id:string;canRead:boolean;canClear:boolean}>}>('GET',`/v1/me/activity-access?${q}`);
        if(!current()||v.memberNumber!==this.owner||v.recoveryGeneration!==source||typeof v.platform!=='boolean'||!Array.isArray(v.items)||v.items.length>batch.length)throw new Error('Invalid access');
        if(offset&&v.platform!==platform)throw new Error('Access changed');platform=v.platform;
        for(const item of v.items){if(!batch.includes(item.id)||scopes.has(item.id)||item.canRead!==true||typeof item.canClear!=='boolean')throw new Error('Invalid scope');scopes.set(item.id,item.canClear);}
      }
      if(!current())return false;this.#source=source;this.#scopes=scopes;this.#platform=platform;this.#expires=this.now()+30_000;return true;
    }catch{return false;}
  }
  #allowed(e:AccountActivityEntry,clear=false):boolean{
    if(!this.#identity())return false;
    if(ACCOUNT_ACTIONS[e.action][0]!=='Moderation')return true;
    return this.client.connected&&this.now()<this.#expires&&e.generation===this.#source&&
      (e.scope==='platform'?this.#platform:this.#scopes.has(e.scope!)&&(!clear||this.#scopes.get(e.scope!)===true));
  }
  override list(kind?:AccountActivityKind):AccountActivityEntry[]{
    return this.#state.entries.filter(e=>e.time>this.now()-30*86400_000&&e.time<=this.now()+300_000&&(!kind||ACCOUNT_ACTIONS[e.action][0]===kind)&&this.#allowed(e)).reverse().sort((a,b)=>b.time-a.time).map(e=>({...e}));
  }
  clearable(kind?:AccountActivityKind):AccountActivityEntry[]{return this.list(kind).filter(e=>this.#allowed(e,true));}
  override clear(ids:ReadonlySet<string>):boolean{
    this.#load();const eligible=new Set(this.clearable().filter(e=>ids.has(e.id)).map(e=>e.id));if(!eligible.size)return false;
    this.#commit({...this.#state,entries:[...this.#state.entries.filter(e=>!eligible.has(e.id)),{id:crypto.randomUUID(),action:'audit_cleared',time:this.now()}]});return true;
  }
  destroy():void{this.#closed=true;this.invalidateAccess();this.#stop();}
}
