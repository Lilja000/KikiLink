import {scopePersistenceName} from '../core/storage-scope';
import {checkThreadIdentity,type ThreadHistoryIdentity,type ThreadHistoryBatch} from '../cloud/thread-history-format';
import {threadFieldTotals} from '../cloud/thread-history-fields';

export const THREAD_COPY_COUNT=8,THREAD_COPY_TOTAL=256*1024*1024,THREAD_COPY_ZIP=130*1024*1024;
export interface ThreadCopySummary {messages:number;files:number;from:number;next:number|null;additionalFields:number}
export interface ThreadHistoryCopy {format:1;id:string;identity:ThreadHistoryIdentity;createdAt:number;summary:ThreadCopySummary;zip:Blob}
export type ThreadHistoryCopyInfo=Omit<ThreadHistoryCopy,'zip'> & {bytes:number};
const need=(ok:unknown)=>{if(!ok)throw new Error('Saved thread history is unsupported or inconsistent. Keep the original ZIP.');};
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<max;
const exact=(v:object,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
export function threadCopyDatabaseName(owner:number):string {need(integer(owner,1));return scopePersistenceName(`kikilink-thread-history-${owner}`);}
export function threadCopyScope(identity:ThreadHistoryIdentity):string {checkThreadIdentity(identity);return JSON.stringify([identity.owner,identity.origin,identity.scope.kind,identity.scope.containerId,identity.scope.id]);}
export function threadCopySummary(batch:ThreadHistoryBatch):ThreadCopySummary {return {messages:batch.rows.length,files:batch.media?.files.length??0,from:batch.from,next:batch.next,additionalFields:threadFieldTotals(batch.rows).fields};}
export function checkThreadCopy(raw:unknown,owner:number):asserts raw is ThreadHistoryCopy {
 const p=raw as ThreadHistoryCopy;need(p&&typeof p==='object'&&!Array.isArray(p)&&exact(p,['format','id','identity','createdAt','summary','zip'])&&p.format===1);
 need(typeof p.id==='string'&&/^[a-f0-9]{64}$/.test(p.id));checkThreadIdentity(p.identity);need(p.identity.owner===owner&&exact(p.identity,['owner','origin','scope'])&&exact(p.identity.scope,['kind','containerId','id','label']));
 need(integer(p.createdAt,1)&&p.createdAt<=Date.now()+300000&&p.zip instanceof Blob&&p.zip.size>0&&p.zip.size<=THREAD_COPY_ZIP);
 const s=p.summary;need(s&&typeof s==='object'&&!Array.isArray(s)&&exact(s,['messages','files','from','next','additionalFields'])&&integer(s.messages,0,201)&&integer(s.files,0,101)&&integer(s.from)&&
  (s.next===null||integer(s.next,1))&&integer(s.additionalFields,0,819201));
}
export function threadCopyInfo(p:ThreadHistoryCopy):ThreadHistoryCopyInfo {const {zip,...info}=p;return {...info,identity:{...p.identity,scope:{...p.identity.scope}},summary:{...p.summary},bytes:zip.size};}
