import {CloudError,type CloudClient} from './client';
import {archiveWait} from './history-archive-model';
import {downloadChatFile} from './chat-file-download';
import {CHAT_FILE_TOTAL,makeChatFile,type ChatFile} from '../storage/chat-file-model';
import {threadFileReferences,threadFileInventory,type ThreadFileReference,type ThreadFileOutcome} from './thread-history-files';
import {checkThreadIdentity,historyBytes,makeThreadHistoryZip,readThreadHistoryZip,threadHistoryPage,THREAD_HISTORY_BYTES,type ThreadHistoryIdentity,type ThreadHistoryBatch,type ThreadHistoryRow} from './thread-history-format';
import {threadFieldTotals} from './thread-history-fields';
import {validHistoryGeneration} from './history-checkpoint';

type Continuation='current'|'unchecked'|'changed'|'unverified';

export class ThreadHistoryArchive {
  readonly identity:ThreadHistoryIdentity;
  #closed=false;#busy=false;#requested=false;#batch:ThreadHistoryBatch|undefined;#membership:number|undefined;
  #files=new Map<string,ChatFile>();#outcomes=new Map<string,ThreadFileOutcome>();
  #fields=threadFieldTotals([]);
  #observed:string|null|undefined;#rejected:string|undefined;#bound=false;
  constructor(readonly client:CloudClient,scope:ThreadHistoryIdentity['scope'],readonly context:()=>boolean,readonly download=downloadChatFile,readonly make=makeChatFile){
    this.identity=Object.freeze({owner:client.memberNumber,origin:client.origin,scope:Object.freeze({...scope})});checkThreadIdentity(this.identity);
  }
  current():boolean{return !this.#closed&&this.context()&&this.client.memberNumber===this.identity.owner&&this.client.origin===this.identity.origin;}
  close():void{this.#closed=true;this.#batch=undefined;this.#membership=undefined;this.#files.clear();this.#outcomes.clear();this.#fields=threadFieldTotals([]);}
  summary(){const b=this.#batch;if(!b||!this.current())return;const inventory=threadFileInventory(b.rows,{files:[...this.#files.values()],outcomes:this.#outcomes});return {messages:b.rows.length,from:b.from,next:b.next,capturedAt:b.capturedAt,deleted:b.rows.filter(r=>r.deletedAt!==null).length,references:inventory.length,requested:this.#requested,continuation:this.#continuation(),
    saved:this.#files.size,bytes:[...this.#files.values()].reduce((n,f)=>n+f.blob.size,0),pending:inventory.filter(f=>f.status==='pending').length,unavailable:inventory.filter(f=>f.status==='unavailable').length,changed:inventory.filter(f=>f.status==='changed').length,overLimit:inventory.filter(f=>f.status==='limit').length,additionalFields:this.#fields.fields,additionalMessages:this.#fields.messages};}
  downloadRequested():void{if(this.current()&&!this.#busy&&this.#batch)this.#requested=true;}
  #check(signal:AbortSignal,online=false):void{if(!this.current()||signal.aborted)throw new Error('History operation stopped.');if(online&&!this.client.connected)throw new Error('Connect to Cloud and retry explicitly.');}
  #continuation():Continuation {
    if(!this.#bound)return 'unverified';
    const generation=this.#batch?.generation??null;
    if(generation!==null&&generation===this.#rejected)return 'changed';
    if(this.#observed===undefined)return 'unchecked';
    return generation===this.#observed?'current':'changed';
  }
  #expectGeneration(generation:string|null,signal:AbortSignal):void {
    this.#check(signal,true);
    if(generation!==this.#observed||generation!==null&&generation===this.#rejected)throw new Error('Cloud history changed. Keep the previous ZIP and read current history from the start.');
  }
  #checkContinuation(signal:AbortSignal):void {
    this.#check(signal,true);
    if(this.#continuation()!=='current')throw new Error('Saved progress cannot continue in the current Cloud history. Keep the original ZIP and explicitly read current history from the start.');
  }
  async #get(path:string,signal:AbortSignal,generation?:string|null):Promise<unknown>{
    this.#check(signal,true);if(generation!==undefined)this.#expectGeneration(generation,signal);
    if(typeof generation==='string')path+=`${path.includes('?')?'&':'?'}recoveryGeneration=${generation}`;
    try{
      const value=await archiveWait(this.client.request('GET',path),signal);this.#check(signal,true);
      if(generation!==undefined)this.#expectGeneration(generation,signal);
      if(typeof generation==='string'&&(!value||typeof value!=='object'||(value as {recoveryGeneration?:unknown}).recoveryGeneration!==generation))throw new Error('Cloud returned history without its expected recovery identity.');
      return value;
    }catch(error){if(typeof generation==='string'&&error instanceof CloudError&&error.code==='recovery_generation_required')this.#rejected=generation;throw error;}
  }
  async #recovery(signal:AbortSignal):Promise<string|null>{
    const me=await this.#get('/v1/me',signal) as {features?:{threadHistoryRecoveryGeneration?:unknown};directRecovery?:{generation?:unknown;restored?:unknown}};
    if(!me||typeof me!=='object')throw new Error('Cloud history identity is unavailable.');
    const supported=me.features?.threadHistoryRecoveryGeneration;
    if(supported!==undefined&&typeof supported!=='boolean')throw new Error('Cloud history identity is unavailable.');
    const generation=supported===true?me.directRecovery?.generation:null;
    if(!validHistoryGeneration(generation)||supported===true&&(generation===null||typeof me.directRecovery?.restored!=='boolean'))throw new Error('Cloud history identity is unavailable.');
    this.#observed=generation;return generation;
  }
  #path(cursor:number,limit=40):string{const s=this.identity.scope;return s.kind==='group'?`/v1/conversations/${s.id}/messages?limit=${limit}&direction=backward&cursor=${cursor}`:`/v1/communities/${s.containerId}/channels/${s.id}/messages?limit=${limit}&cursor=${cursor}`;}
  async #permission(signal:AbortSignal,membership?:number,generation?:string|null):Promise<number|undefined>{
    const s=this.identity.scope;
    if(s.kind==='group'){
      const g=await this.#get(`/v1/groups/${s.containerId}`,signal,generation) as {id?:unknown;conversationId?:unknown;membershipVersion?:number;members?:Array<{memberNumber:number;status:string}>};
      if(!g||g.id!==s.containerId||g.conversationId!==s.id||!Number.isSafeInteger(g.membershipVersion)||g.membershipVersion!<=0||!Array.isArray(g.members)||!g.members.some(m=>m.memberNumber===this.identity.owner&&m.status==='active')||membership!==undefined&&g.membershipVersion!==membership)throw new Error('Group membership changed. Close and review this history again.');
      return g.membershipVersion;
    }
    // This endpoint enforces current membership, channel visibility, archive state and blocks.
    threadHistoryPage(await this.#get(this.#path(0,1),signal,generation),s,0);return undefined;
  }
  async #work<T>(signal:AbortSignal,fn:()=>Promise<T>):Promise<T>{this.#check(signal);if(this.#busy)throw new Error('A history operation is already running.');this.#busy=true;try{return await fn();}finally{this.#busy=false;}}
  async select(file:Blob,signal:AbortSignal):Promise<void>{return this.#work(signal,async()=>{
    if(this.#batch&&!this.#requested)throw new Error('Download this batch before choosing another history ZIP.');
    const batch=await readThreadHistoryZip(file,this.identity,()=>this.#check(signal),signal);this.#check(signal);
    this.#files=new Map(batch.media?.files.map(f=>[f.id,f]));this.#outcomes=batch.media?.outcomes??new Map();delete batch.media;
    this.#fields=threadFieldTotals(batch.rows);this.#batch=batch;this.#bound=batch.generation!==null&&batch.generation!==undefined;this.#requested=true;this.#membership=undefined;
  });}
  async checkContinuation(signal:AbortSignal):Promise<void>{return this.#work(signal,async()=>{await this.#recovery(signal);});}
  async read(signal:AbortSignal,progress:(pages:number,messages:number)=>void=()=>{},restart=false):Promise<void>{return this.#work(signal,async()=>{
    const old=this.#batch;if(old&&(!this.#requested||!restart&&old.next===null))throw new Error(!restart&&old.next===null?'End of available history.':'Download this batch before reading older history.');
    if(old&&!restart&&!this.#bound)throw new Error('Saved progress cannot continue without a known history identity. Read current history from the start.');
    const generation=await this.#recovery(signal);if(old&&!restart)this.#checkContinuation(signal);
    const from=old&&!restart?old.next!:0;let cursor=from,next:number|null=from,bytes=2;
    const membership=await this.#permission(signal,undefined,generation),rows:ThreadHistoryRow[]=[],ids=new Set<string>();
    outer:for(let n=0;n<5;n++){
      const page=threadHistoryPage(await this.#get(this.#path(cursor),signal,generation),this.identity.scope,cursor);
      if(page.membership!==membership)throw new Error('Group membership changed while reading history.');
      for(const row of [...page.rows].reverse()){
        if(ids.has(row.id))throw new Error('Duplicate history identity across pages.');
        const size=historyBytes(row)+1;if(bytes+size>THREAD_HISTORY_BYTES){next=rows.at(-1)!.sequence;break outer;}
        ids.add(row.id);rows.push(row);bytes+=size;
      }
      next=page.next;progress(n+1,rows.length);this.#expectGeneration(generation,signal);if(next===null)break;cursor=next;
    }
    await this.#permission(signal,membership,generation);await this.#recovery(signal);this.#expectGeneration(generation,signal);
    const fields=threadFieldTotals(rows);this.#batch={generation,from,next,rows:rows.reverse(),capturedAt:new Date().toISOString()};this.#bound=true;this.#fields=fields;this.#membership=membership;this.#requested=false;this.#files.clear();this.#outcomes.clear();
  });}
  async #witness(ref:ThreadFileReference,signal:AbortSignal):Promise<boolean>{
    this.#checkContinuation(signal);
    const page=threadHistoryPage(await this.#get(this.#path(ref.witness.sequence+1),signal,this.#batch!.generation??null),this.identity.scope,ref.witness.sequence+1);
    if(page.membership!==this.#membership)throw new Error('Group membership changed while preparing files.');
    return page.rows.some(row=>row.id===ref.witness.id&&JSON.stringify(row)===JSON.stringify(ref.witness));
  }
  async prepare(signal:AbortSignal,progress:()=>void=()=>{}):Promise<{reason:'complete'|'stopped'|'rate-limit'|'error';message:string}>{
    return this.#work(signal,async()=>{
      try{
        this.#check(signal,true);if(!this.#batch)throw new Error('Read or select a history batch first.');
        if(!this.#bound)throw new Error('Saved progress cannot prepare files without a known history identity. Read current history from the start.');
        const generation=await this.#recovery(signal);this.#checkContinuation(signal);
        this.#membership=await this.#permission(signal,this.#membership,generation);
        const refs=threadFileReferences(this.#batch.rows),pending=threadFileInventory(this.#batch.rows,{files:[...this.#files.values()],outcomes:this.#outcomes}).filter(f=>f.status==='pending');
        const changed=(key:string,outcome:ThreadFileOutcome)=>{this.#checkContinuation(signal);this.#outcomes.set(key,outcome);this.#requested=false;progress();this.#checkContinuation(signal);};
        for(const row of pending){
          this.#checkContinuation(signal);const key=`${row.kind}:${row.assetId}`,ref=refs.get(key)!;
          try{
            if(!await this.#witness(ref,signal)){changed(key,'changed');continue;}
            const blob=await archiveWait(this.download(this.client,this.identity.owner,ref.kind,ref.assetId,()=>this.current()&&this.#continuation()==='current',signal),signal);this.#checkContinuation(signal);
            if(blob.size>(ref.kind==='image'?3:16)*1024*1024||blob.size+this.summary()!.bytes>CHAT_FILE_TOTAL){changed(key,await this.#witness(ref,signal)?'limit':'changed');continue;}
            const file=await archiveWait(this.make(ref.kind,ref.assetId,blob,()=>this.#checkContinuation(signal),signal),signal);this.#checkContinuation(signal);
            if(!await this.#witness(ref,signal)){changed(key,'changed');continue;}
            this.#files.set(key,file);this.#requested=false;progress();this.#checkContinuation(signal);
          }catch(error){this.#checkContinuation(signal);if(error instanceof CloudError&&[403,404,410].includes(error.status)){await this.#recovery(signal);this.#checkContinuation(signal);changed(key,'unavailable');continue;}throw error;}
        }
        await this.#permission(signal,this.#membership,generation);await this.#recovery(signal);this.#expectGeneration(generation,signal);
        return {reason:'complete',message:'Available files prepared. Download the ZIP to keep this batch.'};
      }catch(error){return {reason:signal.aborted||!this.current()?'stopped':error instanceof CloudError&&error.status===429?'rate-limit':'error',message:signal.aborted?'Stopped. Previously prepared files are kept.':error instanceof CloudError&&error.status===429?'Cloud rate limit reached. Prepared files are kept; retry manually later.':error instanceof Error?error.message:'Files could not be prepared.'};}
    });
  }
  async zip(signal:AbortSignal):Promise<Blob>{return this.#work(signal,async()=>{
    if(!this.#batch)throw new Error('Read or select a history batch first.');
    const generation=await this.#recovery(signal);
    await this.#permission(signal,this.#batch.generation===generation?this.#membership:undefined,generation);
    const blob=await makeThreadHistoryZip(this.identity,{...this.#batch,media:{files:[...this.#files.values()],outcomes:this.#outcomes}},()=>this.#check(signal,true));
    await this.#recovery(signal);this.#expectGeneration(generation,signal);return blob;
  });}
}
