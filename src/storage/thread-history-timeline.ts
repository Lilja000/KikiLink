import {ThreadHistoryCopyRepository} from './thread-history-copy-repository';
import {threadCopiesToken} from './thread-history-device-source';
import {threadCopyScope,threadCopyInfo,threadCopySummary,THREAD_COPY_COUNT} from './thread-history-copy-model';
import {deviceDataDigest} from './device-data-digest';
import {readThreadHistoryZip,threadHistoryRow,type ThreadHistoryIdentity,type ThreadHistoryRow,type ThreadHistoryScope} from '../cloud/thread-history-format';
import type {OpenThreadCopy} from './thread-history-copy-store';
import type {ChatFile} from './chat-file-model';

/** Read existing immutable copies only; no database creation, write or remote request. */
export async function readThreadTimelineCopies(identity:ThreadHistoryIdentity,current:()=>boolean,signal:AbortSignal,factory:IDBFactory=globalThis.indexedDB):Promise<OpenThreadCopy[]> {
 const scope=threadCopyScope(identity),check=()=>{if(signal.aborted||!current())throw new Error('Combined history closed.');};check();
 const repo=new ThreadHistoryCopyRepository(identity.owner,current,factory),before=await repo.read(signal),copies:OpenThreadCopy[]=[];
 for(const p of before.filter(p=>threadCopyScope(p.identity)===scope)){
  check();if(await deviceDataDigest(p.zip,check)!==p.id)throw new Error('A saved history ZIP is damaged. Keep the original downloads.');
  const batch=await readThreadHistoryZip(p.zip,identity,check,signal);check();
  if(JSON.stringify(threadCopySummary(batch))!==JSON.stringify(p.summary))throw new Error('Saved history metadata is inconsistent. Keep the original downloads.');
  copies.push({info:threadCopyInfo(p),batch,zip:p.zip});
 }
 const after=await repo.read(signal);
 if(threadCopiesToken(after)!==threadCopiesToken(before))throw new Error('Saved batches changed while opening. Refresh combined history.');
 for(const p of after.filter(p=>threadCopyScope(p.identity)===scope))if(await deviceDataDigest(p.zip,check)!==p.id)throw new Error('Saved ZIP bytes changed while opening. Refresh combined history.');
 check();return copies;
}
export interface ThreadTimelineEntry {row:ThreadHistoryRow;source:'saved'|'cloud';files:ReadonlyMap<string,ChatFile>}
export interface ThreadTimeline {entries:ThreadTimelineEntry[];duplicates:number;conflicts:number;fileConflicts:number;covered:number;blocked:number;saved:number;cloud:number}
const core=(r:ThreadHistoryRow)=>JSON.stringify([r.id,r.sequence,r.sender,r.createdAt,r.text,r.deletedAt,r.mediaIds,r.audioIds]);
const identity=(r:ThreadHistoryRow)=>JSON.stringify([r.id,r.sequence,r.sender,r.createdAt]);

/** Presentation only. Archived IDs never enter the live message/receipt/outbox stores. */
export function mergeThreadTimeline(copies:readonly OpenThreadCopy[],scope:ThreadHistoryScope,rawLive:readonly unknown[],hiddenIds:readonly string[]=[],blocked:(member:number)=>boolean=()=>false):ThreadTimeline {
 if(copies.length>THREAD_COPY_COUNT||copies.some(p=>p.batch.rows.length>200)||rawLive.length>200)throw new Error('Combined history exceeds the supported local window.');
 const live=rawLive.map(r=>{const projected=threadHistoryRow(r,scope,false,false);delete projected.archivedFields;return projected;}),liveIDs=new Set(live.map(r=>r.id)),liveSequences=new Set(live.map(r=>r.sequence));
 if(liveIDs.size!==live.length||liveSequences.size!==live.length)throw new Error('Current history is inconsistent. Return to live chat and refresh.');
 const hidden=new Set(hiddenIds),low=Math.min(...liveSequences),high=Math.max(...liveSequences);
 const byID=new Map<string,{row:ThreadHistoryRow;files:Map<string,ChatFile>}[]>(),sequences=new Map<number,Set<string>>();
 for(const p of copies){const files=new Map(p.batch.media?.files.map(f=>[f.id,f]));for(const row of p.batch.rows){
  const records=byID.get(row.id)??[];records.push({row,files});byID.set(row.id,records);
  const ids=sequences.get(row.sequence)??new Set<string>();ids.add(row.id);sequences.set(row.sequence,ids);
 }}
 const result:ThreadTimeline={entries:[],duplicates:0,conflicts:0,fileConflicts:0,covered:0,blocked:0,saved:0,cloud:0};
 for(const [id,records] of byID){
  const first=records[0]!.row;
  if(hidden.has(id)||liveIDs.has(id)||records.some(p=>liveSequences.has(p.row.sequence)||p.row.sequence>=low&&p.row.sequence<=high)){result.covered++;continue;}
  const stable=records.every(p=>identity(p.row)===identity(first)&&sequences.get(p.row.sequence)!.size===1);
  const deleted=records.filter(p=>p.row.deletedAt!==null).sort((a,b)=>b.row.deletedAt!-a.row.deletedAt!)[0]?.row;
  if(!stable||!deleted&&records.some(p=>core(p.row)!==core(first))){result.conflicts++;continue;}
  const row=deleted??first;result.duplicates+=records.length-1;
  const files=new Map<string,ChatFile>(),bad=new Set<string>();
  if(!deleted)for(const p of records)for(const [key,file]of p.files){
   if(!(file.kind==='image'?row.mediaIds:row.audioIds).includes(file.assetId))continue;
   const old=files.get(key);if(old&&(old.sha256!==file.sha256||old.blob.size!==file.blob.size||old.mimeType!==file.mimeType))bad.add(key);else if(!old)files.set(key,file);
  }
  for(const key of bad)files.delete(key);result.fileConflicts+=bad.size;result.entries.push({row,source:'saved',files});
 }
 result.entries.push(...live.map(row=>({row,source:'cloud' as const,files:new Map<string,ChatFile>()})));
 result.entries=result.entries.filter(({row})=>{let hide=true;try{hide=blocked(row.sender);}catch{}if(hide)result.blocked++;return !hide;}).sort((a,b)=>a.row.sequence-b.row.sequence);
 result.saved=result.entries.filter(p=>p.source==='saved').length;result.cloud=result.entries.length-result.saved;return result;
}
