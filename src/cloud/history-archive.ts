import { CloudError } from './client';
import { downloadChatFile } from './chat-file-download';
import { archiveMessage,archiveMessageBytes,archiveWait,CLOUD_ARCHIVE_MESSAGES,CLOUD_ARCHIVE_REFERENCES,CLOUD_ARCHIVE_PAGES,CLOUD_ARCHIVE_METADATA,
  type ArchiveEnvelope,type CloudHistoryArchiveAccess } from './history-archive-model';
import { CHAT_FILE_TOTAL,chatFileId,makeChatFile,type ChatFile,type ChatFileKind } from '../storage/chat-file-model';
import { cloudHistoryZip } from '../storage/cloud-history-zip';
import type { LinkMessage } from '../core/types';
import {makeHistoryCheckpoint,readHistoryCheckpoint,validHistoryGeneration,type HistoryCheckpointIdentity} from './history-checkpoint';
import type {ThreadFileOutcome} from './thread-history-files';

interface Reference {kind:ChatFileKind;assetId:string;witness:ArchiveEnvelope}
interface Batch {generation:string|null;bound:boolean;startedAt:string;from:number;next:number|null;messages:LinkMessage[];rows:ArchiveEnvelope[];references:Map<string,Reference>;hidden:number;requested:boolean}
type Continuation='current'|'changed'|'unverified';
export interface ArchiveSummary {messages:number;references:number;saved:number;bytes:number;pending:number;unavailable:number;changed:number;tooLarge:number;
  hidden:number;from:number;next:number|null;oldest:number;newest:number;requested:boolean;continuation:Continuation}
type Outcome='unavailable'|'changed'|'tooLarge';
export type ArchivePrepareResult={reason:'complete'|'stopped'|'rate-limit'|'error';message:string};

/** Bounded in-memory snapshot. No IndexedDB, settings, playback, receipts or send operations. */
export class CloudHistoryArchive {
  readonly identity:HistoryCheckpointIdentity;
  #batch:Batch|undefined;#files=new Map<string,ChatFile>();#outcomes=new Map<string,Outcome>();#busy=false;#closed=false;
  constructor(readonly access:CloudHistoryArchiveAccess,readonly context:()=>boolean,
    readonly download=downloadChatFile,readonly make=makeChatFile){this.identity=Object.freeze({owner:access.owner,peer:access.peer,origin:access.client.origin,cutoff:access.cutoff});}
  current():boolean {return !this.#closed&&this.context()&&this.access.current()&&this.access.client.memberNumber===this.identity.owner&&this.access.client.origin===this.identity.origin&&this.access.cutoff===this.identity.cutoff;}
  close():void {this.#closed=true;this.#batch=undefined;this.#files.clear();this.#outcomes.clear();}
  summary():ArchiveSummary|undefined {
    if(!this.current())return;
    const b=this.#batch;if(!b)return;
    const outcomes=[...this.#outcomes.values()],times=b.messages.map(m=>m.sentAt);
    return {messages:b.messages.length,references:b.references.size,saved:this.#files.size,bytes:[...this.#files.values()].reduce((n,f)=>n+f.blob.size,0),
      pending:b.references.size-this.#files.size-outcomes.length,unavailable:outcomes.filter(o=>o==='unavailable').length,changed:outcomes.filter(o=>o==='changed').length,
      tooLarge:outcomes.filter(o=>o==='tooLarge').length,hidden:b.hidden,from:b.from,next:b.next,oldest:times.length?Math.min(...times):0,newest:times.length?Math.max(...times):0,requested:b.requested,continuation:this.#continuation(b)};
  }
  #generation():string|null {const value=this.access.recoveryGeneration??null;if(!validHistoryGeneration(value))throw new Error('Cloud history identity is unavailable. Reconnect before reading.');return value;}
  #continuation(batch:Batch):Continuation {
    if(!batch.bound)return 'unverified';
    try{return batch.generation===this.#generation()?'current':'changed';}catch{return 'unverified';}
  }
  #checkGeneration(generation:string|null,signal:AbortSignal):void {
    this.#check(signal,true);
    if(generation!==this.#generation())throw new Error('Cloud history changed. Keep the previous ZIP and read current history from the start.');
  }
  #checkContinuation(batch:Batch,signal:AbortSignal):void {
    this.#check(signal,true);
    if(this.#continuation(batch)!=='current')throw new Error('Saved progress cannot continue in the current Cloud history. Download captured messages and files, then read current history from the start.');
  }
  #check(signal:AbortSignal,online=false):void {
    if(!this.current()||signal.aborted)throw new Error('Cloud history operation stopped or the chat changed.');
    if(online&&!this.access.client.connected)throw new Error('Connect to Cloud to continue. Captured files can still be downloaded.');
  }
  #start(signal:AbortSignal,online=false):void {this.#check(signal,online);if(this.#busy)throw new Error('A history operation is already running.');this.#busy=true;}
  async read(older:boolean,signal:AbortSignal,progress:(pages:number,messages:number)=>void=()=>{}):Promise<void> {
    this.#start(signal,true);
    try{
      const previous=this.#batch;
      if(older&&previous)this.#checkContinuation(previous,signal);
      if(older ? !previous||previous.next===null||previous.messages.length>0&&!previous.requested
        : previous&&(this.#continuation(previous)==='current'||previous.messages.length>0&&!previous.requested))
        throw new Error('Download this batch before continuing to older history.');
      const generation=this.#generation(),from=older?previous!.next!:0,batch:Batch={generation,bound:true,startedAt:new Date().toISOString(),from,next:from,messages:[],rows:[],references:new Map(),hidden:0,requested:false};
      let cursor=from,bytes=0,full=false;const ids=new Set<string>(),clients=new Set<string>();
      for(let n=0;n<CLOUD_ARCHIVE_PAGES&&!full;n++){
        this.#checkGeneration(generation,signal);
        const page=await this.access.read(cursor,()=>this.current()&&generation===this.#generation(),signal);this.#checkGeneration(generation,signal);
        for(const e of [...page.items].reverse()){
          if(ids.has(e.id)||clients.has(e.clientMessageId))throw new Error('Cloud history contains duplicate message identities.');
          ids.add(e.id);clients.add(e.clientMessageId);
          if(e.createdAt<=this.access.cutoff){batch.hidden++;cursor=e.sequence;continue;}
          const message=archiveMessage(e,this.access.owner,this.access.peer,this.access.peerName),size=archiveMessageBytes(message),refs:Reference[]=[
            ...e.mediaIds.map(assetId=>({kind:'image' as const,assetId,witness:e})),...e.audioIds.map(assetId=>({kind:'audio' as const,assetId,witness:e}))];
          const extra=refs.filter(r=>!batch.references.has(chatFileId(r.kind,r.assetId))).length;
          if(batch.messages.length>=CLOUD_ARCHIVE_MESSAGES||bytes+size>CLOUD_ARCHIVE_METADATA||batch.references.size+extra>CLOUD_ARCHIVE_REFERENCES){full=true;break;}
          batch.messages.push(message);batch.rows.push(e);bytes+=size;cursor=e.sequence;
          for(const ref of refs){const key=chatFileId(ref.kind,ref.assetId);if(!batch.references.has(key))batch.references.set(key,ref);}
        }
        batch.next=full?cursor:page.nextCursor;progress(n+1,batch.messages.length);this.#checkGeneration(generation,signal);
        if(batch.next===null)break;
        if(batch.next===0||batch.next>= (n===0&&from===0?Number.MAX_SAFE_INTEGER:page.items.at(-1)!.sequence+1))throw new Error('Cloud history did not advance.');
        cursor=batch.next;
      }
      this.#checkGeneration(generation,signal);batch.messages.reverse();batch.rows.reverse();this.#batch=batch;this.#files.clear();this.#outcomes.clear();
    }finally{this.#busy=false;}
  }
  async #witness(batch:Batch,ref:Reference,signal:AbortSignal):Promise<boolean> {
    this.#checkContinuation(batch,signal);
    const page=await this.access.read(ref.witness.sequence+1,()=>this.current()&&this.#continuation(batch)==='current',signal);this.#checkContinuation(batch,signal);
    return page.items.some(e=>e.id===ref.witness.id&&JSON.stringify(e)===JSON.stringify(ref.witness));
  }
  async prepare(signal:AbortSignal,progress:()=>void=()=>{}):Promise<ArchivePrepareResult> {
    this.#start(signal,true);
    try{
      const batch=this.#batch;if(!batch)throw new Error('Read a history batch first.');
      this.#checkContinuation(batch,signal);
      const outcome=(key:string,value:Outcome)=>{this.#checkContinuation(batch,signal);this.#outcomes.set(key,value);batch.requested=false;progress();this.#checkContinuation(batch,signal);};
      for(const [key,ref]of batch.references){
        this.#checkContinuation(batch,signal);if(this.#files.has(key)||this.#outcomes.has(key))continue;
        try{
          if(!await this.#witness(batch,ref,signal)){outcome(key,'changed');continue;}
          const blob=await archiveWait(this.download(this.access.client,this.access.owner,ref.kind,ref.assetId,()=>this.current()&&this.#continuation(batch)==='current',signal),signal);this.#checkContinuation(batch,signal);
          if(blob.size>(ref.kind==='image'?3:16)*1048576||blob.size+this.summary()!.bytes>CHAT_FILE_TOTAL){outcome(key,'tooLarge');continue;}
          const file=await archiveWait(this.make(ref.kind,ref.assetId,blob,()=>this.#checkContinuation(batch,signal),signal),signal);this.#checkContinuation(batch,signal);
          if(!await this.#witness(batch,ref,signal)){outcome(key,'changed');continue;}
          this.#files.set(key,file);batch.requested=false;progress();this.#checkContinuation(batch,signal);
        }catch(error){
          this.#checkContinuation(batch,signal);
          if(error instanceof CloudError&&[403,404,410].includes(error.status)){outcome(key,'unavailable');continue;}
          throw error;
        }
      }
      return {reason:'complete',message:'Available files prepared. Download the ZIP to keep this batch.'};
    }catch(error){
      return {reason:signal.aborted||!this.current()?'stopped':error instanceof CloudError&&error.status===429?'rate-limit':'error',
        message:signal.aborted?'Stopped. Previously prepared files remain in this batch.':error instanceof CloudError&&error.status===429?'Cloud rate limit reached. Prepared files are kept; retry manually later.':error instanceof Error?error.message:'Files could not be prepared. Previously prepared files are kept.'};
    }finally{this.#busy=false;}
  }
  async zip(version:string,signal:AbortSignal):Promise<Blob> {
    this.#start(signal);
    try{const b=this.#batch;if(!b)throw new Error('Read a history batch first.');return await cloudHistoryZip({owner:this.access.owner,peer:this.access.peer,peerName:this.access.peerName,version,
      startedAt:b.startedAt,messages:b.messages,files:[...this.#files.values()],fromCursor:b.from,nextCursor:b.next,cutoff:this.access.cutoff,missingFiles:b.references.size-this.#files.size,current:()=>this.current(),signal});
    }finally{this.#busy=false;}
  }
  async checkpoint(signal:AbortSignal):Promise<Blob>{
    this.#start(signal);
    try{const b=this.#batch;if(!b)throw new Error('Read a history batch first.');return await makeHistoryCheckpoint(this.identity,{generation:b.generation,startedAt:b.startedAt,from:b.from,next:b.next,hidden:b.hidden,rows:b.rows,
      media:{files:[...this.#files.values()],outcomes:new Map([...this.#outcomes].map(([key,value]):[string,ThreadFileOutcome]=>[key,value==='tooLarge'?'limit':value]))}},()=>this.#check(signal));
    }finally{this.#busy=false;}
  }
  async select(file:Blob,signal:AbortSignal):Promise<void>{
    this.#start(signal);
    try{
      if(this.#batch?.messages.length&&!this.#batch.requested)throw new Error('Download this batch before choosing another progress ZIP.');
      const selected=await readHistoryCheckpoint(file,this.identity,()=>this.#check(signal),signal);this.#check(signal);
      const references=new Map<string,Reference>();
      for(const witness of [...selected.rows].reverse())for(const kind of ['image','audio'] as const)for(const assetId of kind==='image'?witness.mediaIds:witness.audioIds){
        const key=chatFileId(kind,assetId);if(!references.has(key))references.set(key,{kind,assetId,witness});
      }
      this.#batch={generation:selected.generation,bound:selected.generation!==null,startedAt:selected.startedAt,from:selected.from,next:selected.next,hidden:selected.hidden,rows:selected.rows,references,
        messages:selected.rows.map(e=>archiveMessage(e,this.access.owner,this.access.peer,this.access.peerName)),requested:true};
      this.#files=new Map(selected.media.files.map(f=>[f.id,f]));this.#outcomes=new Map([...selected.media.outcomes].map(([key,value])=>[key,value==='limit'?'tooLarge':value]));
    }finally{this.#busy=false;}
  }
  downloadRequested():void {if(this.current()&&this.#batch&&!this.#busy)this.#batch.requested=true;}
}
