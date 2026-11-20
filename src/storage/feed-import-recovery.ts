import { exportValueEncoder } from './device-data-export';
import { parseMetadata } from '../cloud/feed-draft-metadata';
import { feedRowsKey, emptyFeedDraft, validFeedId, type FeedArchiveSource, type FeedRow, type FeedAttachment } from './feed-import-model';
import type { ZipFile } from '../utils/stored-zip';
import { archivedFieldBytes, INERT_ARCHIVED_FIELDS_TOTAL } from './inert-archived-fields';
import { readArchivedFeedFields } from './feed-archived-fields';
import { prepareFeedDraftFields } from './feed-draft-archived-fields';
export const FEED_RECOVERY_BYTES_LIMIT=512*1024*1024;
export interface FeedImportCopy { format:1|2;id:number;owner:number;createdAt:number;phase:'pending'|'complete';before:FeedRow[];beforeDraft:string|null;attempts:Array<string|null>;source:FeedArchiveSource;added:FeedAttachment[];target:string;bytes:number }
export function feedCopyBytes(value:unknown):number {const files:ZipFile[]=[],encode=exportValueEncoder(files,()=>{});return new TextEncoder().encode(JSON.stringify(encode(value))).length+files.reduce((n,f)=>n+f.blob.size,0);}
const body=(c:Pick<FeedImportCopy,'before'|'beforeDraft'|'attempts'|'source'|'added'|'target'>)=>({before:c.before,beforeDraft:c.beforeDraft,attempts:c.attempts,source:c.source,added:c.added,target:c.target});
const baseline=(raw:unknown):raw is string|null=>raw===null || typeof raw==='string' && new TextEncoder().encode(raw).length<=128000;
export function checkFeedCopies(copies:FeedImportCopy[],owner:number):void {
 const ids=new Set<number>();let total=0;
 for(const c of copies){
  if(!c || ![1,2].includes(c.format) || c.owner!==owner || !Number.isSafeInteger(c.id) || c.id<1 || ids.has(c.id) || !Number.isSafeInteger(c.createdAt) || !['pending','complete'].includes(c.phase) || !Array.isArray(c.before) || !baseline(c.beforeDraft) || !Array.isArray(c.attempts) || c.attempts.length>5 || !c.attempts.every(baseline) || !c.source || typeof c.source.metadata!=='string' || typeof c.source.draft!=='string' || !Array.isArray(c.source.files) || c.source.files.some(f=>typeof f?.name!=='string' || !(f.blob instanceof Blob)) || !Array.isArray(c.added) || c.added.length>4 || typeof c.target!=='string')throw new Error('Saved Feed recovery copies are unsupported. Keep them before retrying.');
  feedRowsKey(c.before);ids.add(c.id);const target=parseMetadata(c.target);
  if(!target || target.pending || target.files.length!==c.added.length || new Set(c.added.map(f=>f.id)).size!==c.added.length || c.added.some(f=>!validFeedId(f.id) || !(f.file instanceof Blob) || !target.files.some(m=>m.id===f.id && m.type===f.file.type && m.size===f.file.size)) || !emptyFeedDraft(c.beforeDraft) || c.attempts.some(raw=>raw!==c.target && !emptyFeedDraft(raw)))throw new Error('Saved Feed recovery originals are inconsistent.');
  if(c.format===2){const source=parseMetadata(c.source.draft),before=parseMetadata(c.beforeDraft),retained=before?prepareFeedDraftFields(before):undefined;if(!source||prepareFeedDraftFields(source,retained)!==target.archivedFields)throw new Error('Saved additional Feed draft fields do not match their original.');}
  let archivedBytes=0;
  for(const file of c.added)if(file.archivedFields!==undefined){
   if(typeof file.archivedFields!=='string')throw new Error('Saved Feed fields are unsupported.');readArchivedFeedFields(file.archivedFields);
   archivedBytes+=archivedFieldBytes(file.archivedFields);if(archivedBytes>INERT_ARCHIVED_FIELDS_TOTAL)throw new Error('Saved Feed fields exceed their limit.');
  }
  const size=feedCopyBytes(body(c));if(size!==c.bytes)throw new Error('Saved Feed recovery sizes are inconsistent.');total+=size;
 }
 if(copies.length>3 || total>FEED_RECOVERY_BYTES_LIMIT || copies.filter(c=>c.phase==='pending').length>1)throw new Error('Saved Feed recovery copies exceed their limit.');
}
export function prepareFeedCopy(copies:FeedImportCopy[],owner:number,before:FeedRow[],beforeDraft:string|null,source:FeedArchiveSource,added:FeedAttachment[],target:string):FeedImportCopy {
 checkFeedCopies(copies,owner);if(copies.some(c=>c.phase==='pending'))throw new Error('Finish the unfinished Feed import first.');
 const id=Math.max(0,...copies.map(c=>c.id))+1,attempts:Array<string|null>=[],bytes=feedCopyBytes({before,beforeDraft,attempts,source,added,target});
 if(!Number.isSafeInteger(id) || copies.length>=3 || bytes+copies.reduce((n,c)=>n+c.bytes,0)>FEED_RECOVERY_BYTES_LIMIT)throw new Error('Feed recovery storage is full. No draft was changed.');
 const copy:FeedImportCopy={format:2,id,owner,createdAt:Date.now(),phase:'pending',before,beforeDraft,attempts,source,added,target,bytes};checkFeedCopies([...copies,copy],owner);return copy;
}
export function prepareFeedAttempt(copies:FeedImportCopy[],id:number,owner:number,raw:string|null):FeedImportCopy {
 checkFeedCopies(copies,owner);const copy=copies.find(c=>c.id===id);if(!copy || copy.phase!=='pending')throw new Error('This unfinished Feed import changed.');
 if(raw!==copy.target && !emptyFeedDraft(raw))throw new Error('Your current Feed draft is not empty. Keep or finish it before restoring another draft.');
 const current=parseMetadata(raw),target=parseMetadata(copy.target)!;
 if(raw!==copy.target&&current&&prepareFeedDraftFields(current,target.archivedFields)!==target.archivedFields)throw new Error('Additional draft data changed. Keep or explicitly discard the current draft before finishing this import.');
 if([copy.beforeDraft,...copy.attempts].includes(raw))return copy;
 if(copy.attempts.length>=5)throw new Error('Five different draft originals are already kept. No copy was removed.');
 const next={...copy,attempts:[...copy.attempts,raw]};next.bytes=feedCopyBytes(body(next));checkFeedCopies(copies.map(c=>c.id===id?next:c),owner);return next;
}
export function feedRecoveryHoldIds(copies:FeedImportCopy[],owner:number):Set<string> {checkFeedCopies(copies,owner);return new Set(copies.filter(c=>c.phase==='pending').flatMap(c=>c.added.map(f=>f.id)));}
