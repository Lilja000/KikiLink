import {deviceMusicDatabaseName, MAX_LOCAL_MUSIC_TOTAL_BYTES, type DeviceMusicTrack} from './device-music-store';
import {openMusicDatabase, MUSIC_TRACKS, MUSIC_IMPORTS, checkMusicLayout} from './music-database';
import {feedDatabaseName, feedRowsKey} from './feed-import-model';
import {openFeedDatabase, FEED_ATTACHMENTS, FEED_IMPORTS, checkFeedLayout} from './feed-database';
import {musicRowsKey, musicRecoveryHoldIds} from './music-import-recovery';
import {feedRecoveryHoldIds} from './feed-import-recovery';
import {exportValueEncoder} from './device-data-export';
import {deviceDataDigest} from './device-data-digest';
import type {ZipFile} from '../utils/stored-zip';

export type SavedFileKind = 'music' | 'feed';
export interface SavedFileReferences {token:string; music:ReadonlySet<string>; feed:ReadonlySet<string>}
export interface SavedDeviceFile {readonly kind:SavedFileKind;readonly id:string;readonly name:string;readonly bytes:number;readonly mimeType:string;readonly inUse:boolean;readonly held:boolean}
interface Row {key:IDBValidKey;value:unknown}
interface State {rows:Row[];copies:any[]}
interface Selection {row:Row;blob:Blob;digest:string;references:string}
const stores=(kind:SavedFileKind)=>kind==='music'?[MUSIC_TRACKS,MUSIC_IMPORTS]:[FEED_ATTACHMENTS,FEED_IMPORTS];
const payload=(kind:SavedFileKind,value:any):Blob=>kind==='music'?value.blob:value.file;
const issue='Saved files changed. Refresh the list before removing a file.';

/** Includes every field and binary byte without interpreting unknown values. */
export async function savedFileDigest(row:Row,check:()=>void):Promise<string> {
 const files:ZipFile[]=[],encode=exportValueEncoder(files,check);
 const metadata=JSON.stringify(encode(row));
 if(files.reduce((n,f)=>n+f.blob.size,0)>512*1024*1024)throw new Error('Saved file bytes exceed the supported limit.');
 if(new TextEncoder().encode(metadata).length>2*1024*1024)throw new Error('Saved file metadata exceeds the supported limit.');
 const digests:string[]=[];
 for(const file of files){check();digests.push(await deviceDataDigest(file.blob,check));}
 return deviceDataDigest(new Blob([JSON.stringify([metadata,digests])]),check);
}

/** Existing native stores only. Listing/download never create, upgrade or repair a DB. */
export class SavedDeviceFiles {
 readonly #selections=new WeakMap<SavedDeviceFile,Selection>();
 constructor(readonly owner:number,readonly references:()=>SavedFileReferences,readonly factory:IDBFactory=globalThis.indexedDB){
  if(!Number.isSafeInteger(owner)||owner<=0)throw new Error('A signed-in account is required.');
 }
 #check(current:()=>boolean,signal:AbortSignal):void{if(signal.aborted||!current())throw new Error('Saved file review cancelled.');}
 #name(kind:SavedFileKind):string{return kind==='music'?deviceMusicDatabaseName(this.owner):feedDatabaseName(this.owner);}
 async #open(kind:SavedFileKind,check:()=>void,signal:AbortSignal):Promise<IDBDatabase|undefined>{
  check();if(typeof this.factory?.databases!=='function')throw new Error('This browser cannot safely inspect saved files.');
  const entry=(await this.factory.databases()).find(d=>d.name===this.#name(kind));check();if(!entry)return;
  if(entry.version!==1&&entry.version!==2)throw new Error('Saved files need a newer KikiLink version.');
  return (kind==='music'?openMusicDatabase:openFeedDatabase)(this.#name(kind),this.factory,false,check,signal);
 }
 #validate(kind:SavedFileKind,state:State):Set<string>{
  if(kind==='music'){
   musicRowsKey(state.rows);
   if(state.rows.reduce((n,r)=>n+(r.value as DeviceMusicTrack).blob.size,0)>MAX_LOCAL_MUSIC_TOTAL_BYTES)throw new Error('Saved music exceeds the supported limit.');
   return musicRecoveryHoldIds(state.copies,this.owner,true);
  }
  feedRowsKey(state.rows);return feedRecoveryHoldIds(state.copies,this.owner);
 }
 #transaction<T>(db:IDBDatabase,kind:SavedFileKind,mode:IDBTransactionMode,check:()=>void,signal:AbortSignal,work:(state:State,tx:IDBTransaction,finish:(value:T)=>void,fail:(e:unknown)=>void)=>void):Promise<T>{
  return new Promise((resolve,reject)=>{
   check();const names=stores(kind).slice(0,db.version===1?1:2),tx=db.transaction(names,mode),state:State={rows:[],copies:[]};
   let reason:unknown,ready=0,done=false,result:T;
   const fail=(e:unknown)=>{reason=e;try{tx.abort();}catch{}};
   const abort=()=>fail(new Error('Saved file review cancelled.'));
   const timer=setTimeout(()=>fail(new Error('Saved file verification timed out. No file was removed.')),30000);
   signal.addEventListener('abort',abort,{once:true});db.onversionchange=abort;
   const clean=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
   tx.onabort=()=>{clean();reject(reason??new Error('Saved file transaction failed. No file was removed.'));};
   tx.oncomplete=()=>{clean();try{check();if(!done)throw new Error('Saved file verification was incomplete.');resolve(result!);}catch(e){reject(e);}};
   try{
    (kind==='music'?checkMusicLayout:checkFeedLayout)(db,tx,db.version===2);
    for(const name of names){const request=tx.objectStore(name).openCursor();request.onsuccess=()=>{
     try{
      check();const cursor=request.result;
      if(!cursor){if(++ready===names.length)work(state,tx,value=>{result=value;done=true;},fail);return;}
      if(name===names[0]){if(state.rows.length>=(kind==='music'?100:32))throw new Error('Saved file count exceeds its limit.');state.rows.push({key:cursor.primaryKey,value:cursor.value});}
      else{if(state.copies.length>=3||cursor.value?.id!==cursor.primaryKey)throw new Error('Saved recovery copies are unsupported.');state.copies.push(cursor.value);}
      cursor.continue();
     }catch(e){fail(e);}
    };}
   }catch(e){fail(e);}
  });
 }
 async list(current:()=>boolean,signal:AbortSignal,kinds:readonly SavedFileKind[]=['music','feed']):Promise<SavedDeviceFile[]>{
  const check=()=>this.#check(current,signal);check();const refs=this.references(),result:SavedDeviceFile[]=[];
  for(const kind of kinds){
   const db=await this.#open(kind,check,signal);if(!db)continue;
   let state:State;try{state=await this.#transaction(db,kind,'readonly',check,signal,(s,_tx,done)=>done(s));}finally{db.close();}
   const held=this.#validate(kind,state);
   for(const row of state.rows){
    check();const value=row.value as any,blob=payload(kind,value),name=kind==='music'?value.name:blob instanceof File?blob.name:'Saved Feed image';
    if(typeof name!=='string'||name.length>1024||blob.size<=0)throw new Error('A saved file has unsupported metadata. Its original was kept.');
    const digest=await savedFileDigest(row,check);
    const item=Object.freeze({kind,id:String(row.key),name,bytes:blob.size,mimeType:blob.type,inUse:refs[kind].has(String(row.key)),held:held.has(String(row.key))});
    this.#selections.set(item,{row,blob,digest,references:refs.token});result.push(item);
   }
  }
  check();if(this.references().token!==refs.token)throw new Error(issue);return result;
 }
 download(item:SavedDeviceFile,current:()=>boolean,signal:AbortSignal):Blob{
  this.#check(current,signal);const selected=this.#selections.get(item);if(!selected)throw new Error('This file selection expired.');return selected.blob;
 }
 async remove(item:SavedDeviceFile,current:()=>boolean,signal:AbortSignal):Promise<void>{
  const check=()=>this.#check(current,signal),selected=this.#selections.get(item);this.#selections.delete(item);check();
  if(!selected||item.inUse||item.held)throw new Error('This file is in use or its review expired.');
  const db=await this.#open(item.kind,check,signal);if(!db)throw new Error(issue);
  try{await this.#transaction<void>(db,item.kind,'readwrite',check,signal,(state,tx,done,fail)=>{
   const held=this.#validate(item.kind,state),refs=this.references(),row=state.rows.find(r=>r.key===item.id);
   if(!row||held.has(item.id)||refs.token!==selected.references||refs[item.kind].has(item.id))throw new Error(issue);
   // The native readwrite transaction excludes independent file writers while
   // all bytes are compared. A bounded request chain keeps it alive during hashing;
   // deletion is issued only from an active IndexedDB callback, never a promise task.
   const store=tx.objectStore(stores(item.kind)[0]!);let decision:undefined|boolean,error:unknown,active=true;
   tx.addEventListener('abort',()=>{active=false;});tx.addEventListener('complete',()=>{active=false;});
   const hashingCheck=()=>{check();if(!active)throw new Error('Saved file verification ended.');};
   void savedFileDigest(row,hashingCheck).then(digest=>{decision=digest===selected.digest;},e=>{error=e;decision=false;});
   const next=()=>{const request=store.getKey(item.id);request.onsuccess=()=>{
    try{check();if(decision===undefined){next();return;}if(error)throw error;if(!decision)throw new Error(issue);
     const latest=this.references();if(latest.token!==selected.references||latest[item.kind].has(item.id))throw new Error(issue);
     store.delete(item.id);done();
    }catch(e){fail(e);}
   };};next();
  });}finally{db.close();}
 }
}
