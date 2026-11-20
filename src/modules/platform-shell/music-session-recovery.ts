import type {KeyValueStorage} from '../../core/settings';
import {checkedMusicSource,musicSource,sameMusicSource,musicAction,MusicGenerationError,type MusicSource} from './music-session-generation';
import type {CloudClient} from '../../cloud/client';
import {matchExact as exact,matchInteger as int,matchUuid as uuid} from '../../../cloud/shared/matching.mjs';
export interface MusicPending {format:1|2;source?:MusicSource;label?:string;details?:string;method:'POST'|'PUT';path:string;body:Record<string,unknown>&{operationId:string};createdAt:number;confirmed:boolean;}
export type MusicSessionLock=(key:string,run:()=>Promise<void>)=>Promise<unknown>;
const trackList=(v:unknown)=>Array.isArray(v)&&v.length>0&&v.length<=20&&new Set(v).size===v.length&&v.every(uuid);
export function checkedMusicPending(v:unknown):MusicPending{
 const fail=():never=>{throw new Error('The saved listening request contains unsupported data. It has been kept unchanged.');};
 if(!exact(v,['format','method','path','body','createdAt','confirmed',...(v as MusicPending)?.format===2?['source','label','details']:[]])||![1,2].includes(Number(v.format))||!int(v.createdAt,1,8640000000000000)||typeof v.confirmed!=='boolean'||typeof v.path!=='string')return fail();
 if(v.format===2){checkedMusicSource(v.source);if(typeof v.label!=='string'||v.label.length>240||typeof v.details!=='string'||v.details.length>8000)return fail();}
 const b=v.body,route=/^\/v1\/music-sessions\/([^/]+)\/(membership|control)$/.exec(v.path);
 if(v.path==='/v1/music-sessions'&&v.method==='POST'){if(!exact(b,['operationId','spaceId','tracks'])||!uuid(b.spaceId)||!trackList(b.tracks))return fail();}
 else if(route&&uuid(route[1])&&v.method==='PUT'){
  if(route[2]==='membership'){if(!exact(b,['operationId','revision','sessionRevision','action'])||!int(b.revision)||!int(b.sessionRevision,1)||!['join','leave'].includes(String(b.action)))return fail();}
  else{if(!b||typeof b!=='object'||Array.isArray(b))return fail();const x=b as Record<string,unknown>;const extra=x.action==='queue'?['tracks']:x.action==='select'?['trackId']:x.action==='seek'?['positionMs']:[];
   if(!exact(b,['operationId','revision','action',...extra])||!int(b.revision,1)||!['play','pause','seek','select','queue','end'].includes(String(b.action))||b.action==='queue'&&!trackList(b.tracks)||b.action==='select'&&!uuid(b.trackId)||b.action==='seek'&&!int(b.positionMs,0,86400000))return fail();}
 }else return fail();
 if(!exact(b,Object.keys(b as object))||!uuid(b.operationId)||JSON.stringify(v).length>16384)return fail();return structuredClone(v) as unknown as MusicPending;
}
const equal = (a: MusicPending, b: MusicPending) =>
  JSON.stringify({ ...a, confirmed: false }) ===
  JSON.stringify({ ...b, confirmed: false });
const knownReceipts=new WeakMap<CloudClient,Map<string,string>>();
const fingerprint=(v:MusicPending)=>JSON.stringify({...v,confirmed:false});
/** Durable, explicit retry; refresh/reconnect never send a saved mutation. */
export class MusicSessionRecovery {
  readonly owner: number;
  readonly origin: string;
  readonly key: string;
  constructor(
    readonly client: CloudClient,
    readonly storage: KeyValueStorage,
    readonly current: () => boolean,
    readonly lock?: MusicSessionLock,
  ) {
    this.owner = client.memberNumber;
    this.origin = client.origin;
    if (!int(this.owner, 1) || !this.origin)
      throw new Error("Connect to a Cloud account first.");
    this.key = `kikilink:music-session-recovery:${encodeURIComponent(this.origin)}:${this.owner}:v1`;
  }
  #guard(valid: () => boolean): void {
    if (
      !this.current() ||
      !valid() ||
      this.client.memberNumber !== this.owner ||
      this.client.origin !== this.origin
    )
      throw new Error(
        "Your account or Music view changed. The saved request is kept.",
      );
  }
  async gate(valid:()=>boolean):Promise<MusicSource>{
    this.#guard(valid);
    if(!this.client.connected)throw new Error('Reconnect to use listening sessions.');
    const me=await this.client.request<{memberNumber:number;features?:{musicSessions?:boolean}}>('GET','/v1/me');
    this.#guard(valid);
    if(me.memberNumber!==this.owner||me.features?.musicSessions!==true)throw new Error('Listening sessions need the pending Cloud update and Cloud audio. Your saved request is kept.');
    return musicSource(me);
  }
  confirmed(value:MusicPending):boolean{return value.confirmed||knownReceipts.get(this.client)?.get(this.key)===fingerprint(value);}
  #raw():string|null {
    this.#guard(() => true);
    let raw: string | null;
    try {
      const r = this.storage.getItemResult?.(this.key);
      if (r && !r.ok) throw new Error();
      raw = r ? r.value : this.storage.getItem(this.key);
    } catch {
      throw new Error(
        "The saved Music request could not be read. Nothing has been replaced.",
      );
    }
    return raw;
  }
  read(): MusicPending | null {
    const raw=this.#raw();
    if (raw === null || raw === "null") return null;
    if (raw.length > 16384)
      throw new Error(
        "The saved Music request is too large. It has been kept.",
      );
    return checkedMusicPending(JSON.parse(raw));
  }
  #write(v: MusicPending | null, valid: () => boolean, expected?:string|null): void {
    this.#guard(valid);
    if(expected!==undefined&&this.#raw()!==expected)throw new Error('The saved request changed in another tab. Nothing has been replaced.');
    const raw = JSON.stringify(v);
    try {
      this.storage.setItem(this.key, raw);
      const r = this.storage.getItemResult?.(this.key);
      if (r ? !r.ok || r.value !== raw : this.storage.getItem(this.key) !== raw)
        throw new Error();
    } catch {
      throw new Error(
        "Saving the request on this device could not be confirmed. Reopen Music to check it.",
      );
    }
  }
  async #locked(run: () => Promise<void>): Promise<void> {
    if (this.lock) await this.lock(this.key, run);
    else if (globalThis.navigator?.locks)
      await navigator.locks.request(this.key, run);
    else
      throw new Error(
        "This browser needs Web Locks to save Music requests safely.",
      );
  }
  async prepare(value: MusicPending, valid: () => boolean): Promise<void> {
    const next = checkedMusicPending(value);
    if (next.confirmed)
      throw new Error("A new request cannot already be confirmed.");
    await this.#locked(async () => {
      this.#guard(valid);
      const old = this.read();
      if (old) {
        if (!equal(old, next))
          throw new Error("Recover the pending Music request first.");
        return;
      }
      this.#write(next, valid, this.#raw());
    });
  }
  async run(value: MusicPending, valid: () => boolean): Promise<void> {
    const expected = checkedMusicPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      let raw=this.#raw();
      const pending = this.read();
      if (!pending || !equal(pending, expected))
        throw new Error(
          "The saved request changed in another tab. Reopen Music.",
        );
      const known=knownReceipts.get(this.client)??new Map<string,string>();knownReceipts.set(this.client,known);
      if (!pending.confirmed && known.get(this.key)!==fingerprint(pending)) {
        const source=await this.gate(valid);
        if((pending.format===1?(source.required||source.restored):!pending.source||!sameMusicSource(pending.source,source)||source.restored&&!source.required))throw new MusicGenerationError();
        if(this.#raw()!==raw)throw new Error('The saved request changed in another tab. Reopen Music.');
        const receipt = await this.client.request<unknown>(
          pending.method,
          pending.path,
          {...pending.body,...pending.source?.required?{recoveryGeneration:pending.source.generation}:{}},
        );
        this.#guard(pending.format!==1?()=>true:valid);
        const create=pending.path==='/v1/music-sessions',sid=pending.path.split('/')[3],resourceId=create?pending.body.operationId:pending.path.endsWith('/membership')?`${sid}:${this.owner}`:sid;
        if(!exact(receipt,['operationId','resourceId','revision',...pending.source?.required?['applied','action','recoveryGeneration']:[]])||receipt.operationId!==pending.body.operationId||receipt.resourceId!==resourceId||receipt.revision!==(create?1:Number(pending.body.revision)+1)||pending.source?.required&&(receipt.applied!==true||receipt.action!==musicAction(pending.path,pending.body)||receipt.recoveryGeneration!==pending.source.generation))throw new Error('The result could not be confirmed. Retry the saved request to check it.');
        if(pending.format!==1)known.set(this.key,fingerprint(pending));
      }
      if(!pending.confirmed){this.#write({...pending,confirmed:true},pending.format!==1?()=>true:valid,raw);raw=JSON.stringify({...pending,confirmed:true});}
      if(!valid())return;
      this.#write(null, valid, raw);known.delete(this.key);
    });
  }
  async forget(value: MusicPending, valid: () => boolean): Promise<void> {
    const expected = checkedMusicPending(value);
    await this.#locked(async () => {
      this.#guard(valid);
      const pending = this.read();
      if (!pending || !equal(pending, expected) || pending.confirmed)
        throw new Error(
          "The saved request changed or is already confirmed. Reopen Music.",
        );
      if(knownReceipts.get(this.client)?.get(this.key)===fingerprint(pending))throw new Error('This request is already confirmed. Finish local cleanup instead.');
      this.#write(null, valid, this.#raw());
    });
  }
}
