import { AccountKeyValueStorage } from './account-data-storage';
import type { KeyValueStorage } from '../core/settings';
import { FEED_DRAFT_METADATA_KEY, parseMetadata } from '../cloud/feed-draft-metadata';
import { FEED_ATTACHMENTS, FEED_IMPORTS, checkFeedLayout, openFeedDatabase } from './feed-database';
import { feedDatabaseName, feedRowsKey, emptyFeedDraft, prepareFeedSource, snapshotFeedSource, type FeedArchiveSource, type FeedRow, type PreparedFeed, type FeedAttachment } from './feed-import-model';
import { prepareFeedCopy, prepareFeedAttempt, checkFeedCopies, type FeedImportCopy } from './feed-import-recovery';
import { exportValueEncoder } from './device-data-export';
import { storedZip, type ZipFile } from '../utils/stored-zip';
import { prepareFeedDraftFields } from './feed-draft-archived-fields';
export interface FeedImportSession { current():boolean; matches(raw:string|null):boolean; invalidate():void }
export interface FeedImportDestination { prepare(owner:number):Promise<FeedImportSession> }
export interface FeedImportReview { readonly resume:boolean; readonly images:number; readonly text:string; readonly poll:boolean; readonly pendingExcluded:boolean; readonly bytes:number; readonly recoveryBytes:number }
interface State {rows:FeedRow[];copies:FeedImportCopy[]}
interface Pending {review:FeedImportReview;baseline:string|null;keys:string;journal:string;session:FeedImportSession;source?:FeedArchiveSource;prepared?:PreparedFeed;copyId?:number}
const journal=(copies:FeedImportCopy[])=>JSON.stringify(copies.map(c=>[c.id,c.createdAt,c.bytes,c.phase,c.attempts.length]).sort((a,b)=>Number(a[0])-Number(b[0])));
const occupied=()=>new Error('Your current Feed draft is not empty. Keep or finish it before restoring another draft.');
/** Files and originals commit together; draft metadata and completion are separately verified. */
export class FeedArchiveImporter {
 readonly name:string;readonly metadata:AccountKeyValueStorage;#pending:Pending|undefined;#generation=0;
 constructor(readonly owner:number,readonly destination:FeedImportDestination,readonly factory:IDBFactory=indexedDB,metadata:KeyValueStorage=localStorage){
  if(!Number.isSafeInteger(owner)||owner<=0)throw new Error('A signed-in account is required.');this.name=feedDatabaseName(owner);this.metadata=new AccountKeyValueStorage(owner,metadata);
 }
 cancel():void{++this.#generation;this.#pending=undefined;}
 #check(current:()=>boolean,signal:AbortSignal):void{if(!current()||signal.aborted)throw new Error('Feed import cancelled.');}
 #raw():string|null{const raw=this.metadata.getItem(FEED_DRAFT_METADATA_KEY);if(raw!==null&&new TextEncoder().encode(raw).length>128000)throw new Error('Current Feed metadata exceeds its snapshot limit.');return raw;}
 #baseline(p:Pending):void{if(!p.session.current()||this.#raw()!==p.baseline||!p.session.matches(p.baseline))throw new Error('Your Feed draft changed. Review the import again.');}
 #review(copy:FeedImportCopy,resume:boolean,recoveryBytes:number):FeedImportReview{const target=parseMetadata(copy.target)!;return Object.freeze({resume,images:copy.added.length,text:target.text,poll:!!target.poll,pendingExcluded:!!parseMetadata(copy.source.draft)?.pending,bytes:copy.added.reduce((n,f)=>n+f.file.size,0),recoveryBytes});}
 async review(source:FeedArchiveSource,current:()=>boolean,signal:AbortSignal):Promise<FeedImportReview>{
  this.cancel();const generation=this.#generation,check=()=>this.#check(()=>generation===this.#generation&&current(),signal);check();source=snapshotFeedSource(source);if(!emptyFeedDraft(this.#raw()))throw occupied();
  const session=await this.destination.prepare(this.owner),baseline=this.#raw();check();if(!session.current()||!session.matches(baseline)||!emptyFeedDraft(baseline))throw occupied();
  const state=await this.#read(check,signal);if(state.copies.some(c=>c.phase==='pending'))throw new Error('Review and finish the unfinished Feed import first.');
  const previous=parseMetadata(baseline),retained=previous?prepareFeedDraftFields(previous):undefined;
  const prepared=await prepareFeedSource(source,this.owner,state.rows,check,signal,undefined,undefined,retained),copy=prepareFeedCopy(state.copies,this.owner,state.rows,baseline,source,prepared.added,prepared.target),review=this.#review(copy,false,copy.bytes);
  const pending={review,baseline,keys:feedRowsKey(state.rows),journal:journal(state.copies),session,source,prepared};this.#baseline(pending);check();this.#pending=pending;return review;
 }
 async reviewPending(current:()=>boolean,signal:AbortSignal):Promise<FeedImportReview>{
  this.cancel();const generation=this.#generation,check=()=>this.#check(()=>generation===this.#generation&&current(),signal),state=await this.#read(check,signal),copy=state.copies.find(c=>c.phase==='pending');if(!copy)throw new Error('There is no unfinished Feed import.');
  const raw=this.#raw();if(raw!==copy.target&&!emptyFeedDraft(raw))throw occupied();
  const session=await this.destination.prepare(this.owner),baseline=this.#raw();check();if(!session.current()||!session.matches(baseline))throw new Error('Your Feed editor has unsaved changes. Keep them before importing.');
  if(!await this.#filesPresent(copy,state.rows,check))throw new Error('The unfinished Feed import’s images changed. Keep its recovery copies.');
  const next=prepareFeedAttempt(state.copies,copy.id,this.owner,baseline),review=this.#review(copy,true,next.bytes-copy.bytes);
  check();this.#pending={review,baseline,keys:feedRowsKey(state.rows),journal:journal(state.copies),session,copyId:copy.id};return review;
 }
 async apply(review:FeedImportReview,current:()=>boolean,signal:AbortSignal):Promise<number>{
  const p=this.#pending;this.cancel();const generation=this.#generation,active=()=>generation===this.#generation&&current();if(!p||p.review!==review)throw new Error('This Feed review expired. Review it again.');
  try{return await this.#apply(p,active,signal);}finally{p.session.invalidate();}
 }
 async #apply(p:Pending,current:()=>boolean,signal:AbortSignal):Promise<number>{
  const check=()=>this.#check(()=>current()&&p.session.current(),signal);check();this.#baseline(p);await this.#inventory(check);
  const db=await openFeedDatabase(this.name,this.factory,true,check,signal);let saved:FeedImportCopy|undefined;
  try{await this.#transaction(db,'readwrite',check,signal,state=>{
   this.#baseline(p);if(feedRowsKey(state.rows)!==p.keys||journal(state.copies)!==p.journal)throw new Error('Feed files or recovery copies changed. Review the import again.');
   if(p.review.resume){const old=state.copies.find(c=>c.id===p.copyId)!;saved=prepareFeedAttempt(state.copies,p.copyId!,this.owner,p.baseline);if(saved.bytes-old.bytes!==p.review.recoveryBytes)throw new Error('Feed recovery size changed. Review again.');return tx=>{check();tx.objectStore(FEED_IMPORTS).put(saved!);};}
   if(!emptyFeedDraft(p.baseline))throw occupied();saved=prepareFeedCopy(state.copies,this.owner,state.rows,p.baseline,p.source!,p.prepared!.added,p.prepared!.target);
   if(saved.bytes!==p.review.recoveryBytes)throw new Error('Feed recovery size changed. Review again.');
   return tx=>{check();tx.objectStore(FEED_IMPORTS).add(saved!);for(const file of saved!.added){check();tx.objectStore(FEED_ATTACHMENTS).add(file);}check();};
  });}finally{db.close();}
  try{
   check();const state=await this.#read(check,signal),copy=state.copies.find(c=>c.id===saved!.id);if(!copy||copy.phase!=='pending'||journal([copy])!==journal([saved!])||!await this.#filesPresent(copy,state.rows,check))throw new Error('Saved Feed files changed.');
   check();this.#baseline(p);
   if(p.baseline!==copy.target){if(!emptyFeedDraft(p.baseline))throw occupied();this.metadata.setItem(FEED_DRAFT_METADATA_KEY,copy.target);}
   if(this.#raw()!==copy.target)throw new Error('Draft metadata could not be confirmed.');check();
   const completed=await openFeedDatabase(this.name,this.factory,false,check,signal);
   try{await this.#transaction(completed,'readwrite',check,signal,next=>{
    if(this.#raw()!==copy.target)throw new Error('Draft changed before completion.');const actual=next.copies.find(c=>c.id===copy.id);if(!actual||actual.phase!=='pending'||journal([actual])!==journal([copy]))throw new Error('Feed recovery changed before completion.');
    return tx=>{check();tx.objectStore(FEED_IMPORTS).put({...actual,phase:'complete'});};
   });}finally{completed.close();}
   const result=await this.inspectLast(current,signal);if(result.id!==saved!.id||result.state!=='complete')throw new Error('Feed result changed.');
  }catch{throw new Error('Feed images and recovery originals were saved, but completion could not be confirmed. Reload, check the last Feed import and review its unfinished draft.');}
  return saved!.id;
 }
 async recoveryState(current:()=>boolean,signal:AbortSignal):Promise<{count:number;pending:boolean}>{const state=await this.#read(()=>this.#check(current,signal),signal);return {count:state.copies.length,pending:state.copies.some(c=>c.phase==='pending')};}
 async inspectLast(current:()=>boolean,signal:AbortSignal):Promise<{id:number;state:'complete'|'pending'|'changed'}>{
  const check=()=>this.#check(current,signal),state=await this.#read(check,signal),copy=[...state.copies].sort((a,b)=>a.id-b.id).at(-1);if(!copy)throw new Error('There are no saved Feed import copies.');
  if(!await this.#filesPresent(copy,state.rows,check))return {id:copy.id,state:'changed'};if(copy.phase==='pending')return {id:copy.id,state:'pending'};
  return {id:copy.id,state:this.#raw()===copy.target?'complete':'changed'};
 }
 async #filesPresent(copy:FeedImportCopy,rows:FeedRow[],check:()=>void):Promise<boolean>{
  const values=new Map(rows.map(r=>[r.key,r.value]));for(const expected of copy.added){check();const actual=values.get(expected.id) as FeedAttachment|undefined;
   if(!actual||actual.id!==expected.id||actual.archivedFields!==expected.archivedFields||!(actual.file instanceof Blob)||actual.file.size!==expected.file.size||actual.file.type!==expected.file.type)return false;
   for(let offset=0;offset<expected.file.size;offset+=1024*1024){const a=new Uint8Array(await actual.file.slice(offset,offset+1024*1024).arrayBuffer()),b=new Uint8Array(await expected.file.slice(offset,offset+1024*1024).arrayBuffer());check();if(a.some((v,i)=>v!==b[i]))return false;}
  }return true;
 }
 async recoveryDownload(current:()=>boolean,signal:AbortSignal):Promise<Blob>{
  const check=()=>this.#check(current,signal),state=await this.#read(check,signal);if(!state.copies.length)throw new Error('There are no saved Feed import copies.');
  const files:ZipFile[]=[],encode=exportValueEncoder(files,check);files.push({name:'recovery.json',blob:new Blob([JSON.stringify({format:'kikilink-feed-recovery',version:1,owner:this.owner,database:this.name,copies:encode(state.copies)})],{type:'application/json'})});files.push({name:'README.txt',blob:new Blob(['Private Feed recovery originals: native image records, exact draft metadata, source and retry baselines. Archived pending posts are inert. Not a device import ZIP; no automatic rollback.\n'])});return storedZip(files,check);
 }
 async #inventory(check:()=>void):Promise<IDBDatabaseInfo|undefined>{check();if(typeof this.factory.databases!=='function')throw new Error('This browser cannot safely inspect Feed storage.');const entry=(await this.factory.databases()).find(d=>d.name===this.name);check();if(entry&&![1,2].includes(entry.version!))throw new Error('Feed storage needs a newer KikiLink version.');return entry;}
 async #read(check:()=>void,signal:AbortSignal):Promise<State>{if(!await this.#inventory(check))return {rows:[],copies:[]};const db=await openFeedDatabase(this.name,this.factory,false,check,signal);let state:State|undefined;try{await this.#transaction(db,'readonly',check,signal,value=>{state=value;});}finally{db.close();}check();return state!;}
 #transaction(db:IDBDatabase,mode:IDBTransactionMode,check:()=>void,signal:AbortSignal,ready:(state:State)=>((tx:IDBTransaction)=>void)|void):Promise<void>{return new Promise((resolve,reject)=>{
  check();const names=db.version===1?[FEED_ATTACHMENTS]:[FEED_ATTACHMENTS,FEED_IMPORTS],tx=db.transaction(names,mode);let reason='The Feed transaction failed. No partial image import was committed.';
  const abort=()=>{try{tx.abort();}catch{/* settled */}};const timer=setTimeout(abort,30000);signal.addEventListener('abort',abort,{once:true});db.onversionchange=abort;
  const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};tx.onabort=()=>{finish();reject(new Error(reason));};tx.oncomplete=()=>{finish();resolve();};
  const state:State={rows:[],copies:[]};let done=0;
  try{checkFeedLayout(db,tx,db.version===2);for(const name of names){const request=tx.objectStore(name).openCursor();request.onsuccess=()=>{try{check();const cursor=request.result;if(!cursor){if(++done===names.length){feedRowsKey(state.rows);checkFeedCopies(state.copies,this.owner);ready(state)?.(tx);}return;}
   if(name===FEED_ATTACHMENTS){if(state.rows.length>=32)throw new Error('Current Feed image storage exceeds its snapshot limit.');state.rows.push({key:cursor.primaryKey,value:cursor.value});}else{if(state.copies.length>=3||cursor.value?.id!==cursor.primaryKey)throw new Error('Feed recovery storage is unsupported.');state.copies.push(cursor.value);}cursor.continue();}catch(e){reason=e instanceof Error?e.message:reason;abort();}};}}
  catch(e){reason=e instanceof Error?e.message:reason;abort();}
 });}
}
