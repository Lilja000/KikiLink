import type {KeyValueStorage} from '../core/settings';

export interface PendingGroupReceipt {groupId:string;conversationId:string;state:'delivered'|'read'}
export interface GroupReadCheckpoint {
  format:1;owner:number;origin:string;generation:string;
  reads:Array<[string,number]>;pendingReads:Array<[string,number]>;receipts:Array<[string,PendingGroupReceipt]>;
}
export interface GroupRecovery {generation:string;restored:boolean}
const identity=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=80;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&Object.keys(v).every(n=>names.includes(n));
const generation=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/u.test(v);
const cursor=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const error=()=>new Error('Group read state changed or could not be preserved. Reload before syncing groups.');
function pairs(value:unknown,limit:number,valid:(v:unknown)=>boolean):boolean {
  return Array.isArray(value)&&value.length<=limit&&value.every(v=>Array.isArray(v)&&v.length===2&&identity(v[0])&&valid(v[1]))&&new Set(value.map(v=>v[0])).size===value.length;
}
const receipt=(v:unknown)=>object(v)&&keys(v,['groupId','conversationId','state'])&&identity(v.groupId)&&identity(v.conversationId)&&(v.state==='delivered'||v.state==='read');
function checkpoint(raw:string,owner:number):GroupReadCheckpoint {
  if(raw.length>2*1024*1024)throw error();
  const v:unknown=JSON.parse(raw);
  if(!object(v)||!keys(v,['format','owner','origin','generation','reads','pendingReads','receipts'])||v.format!==1||v.owner!==owner||typeof v.origin!=='string'||v.origin.length>2048||!generation(v.generation)||!pairs(v.reads,100,cursor)||!pairs(v.pendingReads,100,cursor)||!pairs(v.receipts,500,receipt))throw error();
  return v as unknown as GroupReadCheckpoint;
}
/** One verified active-key commit. Exact old bytes remain inert; they are never replayed. */
export class GroupReadState {
  readonly key:string;readonly readsKey:string;readonly receiptsKey:string;
  #expected:string|null=null;#version:string|null|undefined;#state:GroupReadCheckpoint|undefined;#initialized=false;#failed=false;
  constructor(readonly storage:KeyValueStorage,readonly owner:number,readonly origin:string){
    this.key=`kikilink:cloud:group-state:${owner}:v2`;this.readsKey=`kikilink:cloud:group-reads:${owner}:v1`;this.receiptsKey=`kikilink:cloud:group-receipts:${owner}:v1`;
    try{this.#expected=this.#read(this.key);this.#version=storage.getMutationVersion?.(this.key);}catch{this.#failed=true;}
  }
  #read(key:string):string|null {
    const result=this.storage.getPersistedItemResult?.(key)??this.storage.getItemResult?.(key);
    if(result){if(!result.ok)throw error();return result.value;}
    return this.storage.getItem(key);
  }
  check():void {
    if(this.#failed||this.#read(this.key)!==this.#expected||this.storage.getMutationVersion?.(this.key)!==this.#version)throw error();
  }
  current():boolean {try{this.check();return true;}catch{return false;}}
  get bound():boolean{return this.#state!==undefined;}
  get hasCheckpoint():boolean{return this.#expected!==null;}
  get generation():string|undefined{return this.#state?.generation;}
  #commit(value:GroupReadCheckpoint):void {
    this.check();const bytes=JSON.stringify(value);
    try{checkpoint(bytes,this.owner);this.storage.setItem(this.key,bytes);if(this.#read(this.key)!==bytes)throw error();this.#expected=bytes;this.#version=this.storage.getMutationVersion?.(this.key);this.#state=value;}
    catch{this.#failed=true;throw error();}
  }
  save(reads:Map<string,number>,pendingReads:Map<string,number>,receipts:Map<string,PendingGroupReceipt>):void {
    if(!this.#state)throw error();
    this.#commit({...this.#state,reads:[...reads],pendingReads:[...pendingReads],receipts:[...receipts].map(([id,v])=>[id,{...v}])});
  }
  prepare(recovery:GroupRecovery|undefined):{state?:GroupReadCheckpoint;applied:boolean;reset:boolean} {
    this.check();
    if(!recovery){if(this.#expected!==null)throw new Error('Cloud group recovery identity is unavailable. Reconnect before syncing groups.');return {applied:false,reset:false};}
    if(!generation(recovery.generation)||typeof recovery.restored!=='boolean'||!this.origin)throw error();
    const old=this.#expected===null?undefined:checkpoint(this.#expected,this.owner);
    if(old?.generation===recovery.generation&&old.origin===this.origin){const applied=!this.#initialized;this.#state=old;this.#initialized=true;return {state:old,applied,reset:false};}
    const legacyReads=this.#read(this.readsKey),legacyReceipts=this.#read(this.receiptsKey);
    const original={format:1,owner:this.owner,active:this.#expected,legacyReads,legacyReceipts};
    const bytes=JSON.stringify(original);if(bytes.length>2*1024*1024)throw error();
    if(this.#expected!==null||legacyReads!==null||legacyReceipts!==null){
      const key=`${this.key}:recovery:${recovery.generation}${old&&old.origin!==this.origin?':origin:'+encodeURIComponent(this.origin):''}`;
      if(key.length>2048)throw error();const saved=this.#read(key);
      if(saved!==null&&saved!==bytes)throw error();
      if(saved===null)this.storage.setItem(key,bytes);
      if(this.#read(key)!==bytes)throw error();
    }
    const reset=!!old||recovery.restored;
    const reads:Array<[string,number]>=[],receipts:Array<[string,PendingGroupReceipt]>=[];
    if(!reset){
      try{const v:unknown=JSON.parse(legacyReads??'{}');if(object(v))for(const [id,n]of Object.entries(v).slice(0,100))if(identity(id)&&cursor(n))reads.push([id,n]);}catch{/* The exact malformed legacy bytes were preserved above. */}
      try{const v:unknown=JSON.parse(legacyReceipts??'[]');if(Array.isArray(v))for(const item of v.slice(-500))if(object(item)&&identity(item.messageId)&&identity(item.groupId)&&identity(item.conversationId)&&(item.state==='delivered'||item.state==='read'))receipts.push([item.messageId,{groupId:item.groupId,conversationId:item.conversationId,state:item.state}]);}catch{/* Never execute malformed pending data. */}
    }
    const next:GroupReadCheckpoint={format:1,owner:this.owner,origin:this.origin,generation:recovery.generation,reads,pendingReads:[],receipts:[...new Map(receipts)]};
    if(this.#read(this.readsKey)!==legacyReads||this.#read(this.receiptsKey)!==legacyReceipts)throw error();
    this.#commit(next);this.#initialized=true;return {state:next,applied:true,reset};
  }
}
