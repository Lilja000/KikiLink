import {CHAT_FILE_TOTAL} from '../storage/chat-file-model';
import {readThreadFiles,threadFilePayload,THREAD_FILES_METADATA,type ThreadHistoryMedia} from './thread-history-files';
import {KIKILINK_PLATFORM_PREVIEW} from '../core/distribution';
import {validChatAttachmentIds} from '../core/chat-attachments';
import {storedZip} from '../utils/stored-zip';
import {readStoredZip,verifyEntry} from '../utils/read-stored-zip';
import {captureThreadFields,readThreadFields,threadFieldTotals} from './thread-history-fields';
import {validHistoryGeneration} from './history-checkpoint';

export const THREAD_HISTORY_BYTES=1024*1024, THREAD_HISTORY_ROWS=200;
export interface ThreadHistoryScope {kind:'group'|'channel';containerId:string;id:string;label:string}
export interface ThreadHistoryRow {id:string;sequence:number;sender:number;createdAt:number;text:string|null;deletedAt:number|null;mediaIds:string[];audioIds:string[];archivedFields?:string}
export interface ThreadHistoryBatch {generation?:string|null;from:number;next:number|null;rows:ThreadHistoryRow[];capturedAt:string;media?:ThreadHistoryMedia}
export interface ThreadHistoryIdentity {owner:number;origin:string;scope:ThreadHistoryScope}
const distribution=()=>KIKILINK_PLATFORM_PREVIEW?'platform-preview':'stable';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<Number.MAX_SAFE_INTEGER;
const id=(v:unknown):v is string=>validChatAttachmentIds([v],1);
function fail():never{throw new Error('Unsupported or inconsistent group/channel history. Select the original history ZIP.');}
const keys=(o:Record<string,unknown>,expected:string[])=>Object.keys(o).sort().join(',')===expected.sort().join(',');
export const historyBytes=(v:unknown):number=>new TextEncoder().encode(JSON.stringify(v)).length;

export function checkThreadIdentity(v:ThreadHistoryIdentity):void {
  if(!integer(v.owner,1)||typeof v.origin!=='string'||v.origin.length>2048||!v.origin||!object(v.scope)||
    !['group','channel'].includes(v.scope.kind)||!id(v.scope.id)||!id(v.scope.containerId)||typeof v.scope.label!=='string'||v.scope.label.length>500)fail();
}
/** Known live fields are projected; extra JSON fields remain in an inactive tagged string. */
export function threadHistoryRow(raw:unknown,scope:ThreadHistoryScope,archived=false,allowFields=true):ThreadHistoryRow {
  if(!object(raw)||!id(raw.id)||!integer(raw.sequence,1)||!integer(raw.createdAt,1)||raw.createdAt>Date.now()+300000)fail();
  const sender=archived||scope.kind==='group'?raw.sender:raw.author;
  const deletedAt=archived||scope.kind==='group'?raw.deletedAt:null;
  if(!integer(sender,1)||deletedAt!==null&&(!integer(deletedAt,1)||deletedAt<raw.createdAt||deletedAt>Date.now()+300000)||
    !(typeof raw.text==='string'&&raw.text.length<=4000||raw.text===null&&deletedAt!==null)||
    !validChatAttachmentIds(raw.mediaIds??[],4)||!validChatAttachmentIds(raw.audioIds??[],1))fail();
  const mediaIds=[...((raw.mediaIds??[]) as string[])],audioIds=[...((raw.audioIds??[]) as string[])];
  if(mediaIds.some(v=>audioIds.includes(v))||deletedAt!==null&&(raw.text!==null||mediaIds.length||audioIds.length)||
    deletedAt===null&&!raw.text&&!mediaIds.length&&!audioIds.length)fail();
  if(!archived&&scope.kind==='group'&&(raw.conversationId!==scope.id||raw.schemaVersion!==1||raw.encryption!=='server-aes-256-gcm'||!integer(raw.membershipVersion,1)||!integer(raw.keyVersion,1)))fail();
  if(archived&&!keys(raw,['id','sequence','sender','createdAt','text','deletedAt','mediaIds','audioIds',...(allowFields&&raw.archivedFields!==undefined?['archivedFields']:[])]))fail();
  let archivedFields:string|undefined;
  if(archived&&raw.archivedFields!==undefined){if(deletedAt!==null||typeof raw.archivedFields!=='string')fail();readThreadFields(raw.archivedFields,scope.kind);archivedFields=raw.archivedFields;}
  else if(!archived&&deletedAt===null)archivedFields=captureThreadFields(raw,scope.kind);
  return {id:raw.id,sequence:raw.sequence,sender,createdAt:raw.createdAt,text:raw.text as string|null,deletedAt,mediaIds,audioIds,...(archivedFields!==undefined?{archivedFields}:{})};
}
export function threadHistoryPage(raw:unknown,scope:ThreadHistoryScope,from:number):{rows:ThreadHistoryRow[];next:number|null;membership?:number} {
  if(!integer(from)||!object(raw)||!Array.isArray(raw.items)||raw.items.length>40)fail();
  const rows=raw.items.map(item=>threadHistoryRow(item,scope));checkRows(rows,from,raw.nextCursor,40);
  if(scope.kind==='group'&&(!integer(raw.membershipVersion,1)||!integer(raw.keyVersion,1)))fail();
  return {rows,next:raw.nextCursor as number|null,...(scope.kind==='group'?{membership:raw.membershipVersion as number}:{})};
}
function checkRows(rows:ThreadHistoryRow[],from:number,next:unknown,max:number):void {
  const ids=new Set<string>();
  if(!integer(from)||rows.length>max||next!==null&&(!integer(next,1)||next!==rows[0]?.sequence))fail();
  rows.forEach((r,i)=>{if(from>0&&r.sequence>=from||i>0&&r.sequence<=rows[i-1]!.sequence||ids.has(r.id))fail();ids.add(r.id);});
}
const README=`KikiLink group/channel history, format 4. Private, unencrypted ZIP.\nRead messages.json as data. attachments.json lists saved files and pending, unavailable, changed or over-limit references. Optional files are original WebP/MP3 bytes under attachments/. Known transport URLs and playback tickets are excluded. Up to 100 unique files and 128 MiB per batch; WebP 3 MiB and MP3 16 MiB each. Additional message JSON, including mentions and reactions when supplied by history, is preserved inside an inactive archivedFields string. Known routing, receipt, retry, authentication and encryption fields are excluded. Unknown nested values may contain private data or URL text; nothing is followed or executed. Metadata is bounded to 128 KiB per message, 4096 nodes and depth 32; the 1 MiB message batch limit still applies. Settings, other chats and account data are not read. Old formats 1–3 remain readable; older clients reject format 4. The manifest retains the captured database generation; null means unknown. A saved cursor or pending-file request can continue only with the same known generation. Old or unknown generations require an explicit new read from the latest history; no cursor is guessed or rebound. Captured files and inactive fields remain available for export after a fresh current-access check. Deleted group messages are tombstones, without content.\nThis is one bounded batch, not a full account or atomic Cloud backup. Current membership, blocks, joined-history boundary, deletion and retention rules apply to each server read. Already saved files cannot be recalled.\nKeep each ZIP. Reopen the same group/channel, choose Save history ZIP, select this file and explicitly read the older batch. Selection performs no network request. A changed label is allowed; account, server, distribution and IDs must match. CRC checks detect damage, not authenticity. Never trust the author of an unknown archive.\nA download request does not prove the browser saved a file. Resume does not restore messages into Cloud or the live conversation and never sends, acknowledges, marks read or plays anything. Permission is rechecked before download; this is not a content snapshot lock.\n`;
export async function makeThreadHistoryZip(identity:ThreadHistoryIdentity,batch:ThreadHistoryBatch,check:()=>void):Promise<Blob> {
  check();checkThreadIdentity(identity);checkRows(batch.rows,batch.from,batch.next,THREAD_HISTORY_ROWS);
  const rows=batch.rows.map(row=>threadHistoryRow(row,identity.scope,true));if(historyBytes(rows)>THREAD_HISTORY_BYTES)fail();
  const payload=threadFilePayload(rows,batch.media??{files:[],outcomes:new Map()});
  const generation=batch.generation??null;if(!validHistoryGeneration(generation))fail();
  const manifest={format:'kikilink-thread-history',version:4,distribution:distribution(),...identity,generation,from:batch.from,next:batch.next,capturedAt:batch.capturedAt,messages:rows.length,files:payload.files,fileBytes:payload.bytes,metadata:threadFieldTotals(rows)};
  return storedZip([{name:'manifest.json',blob:new Blob([JSON.stringify(manifest)])},{name:'messages.json',blob:new Blob([JSON.stringify(rows)])},{name:'README.txt',blob:new Blob([README])},...payload.entries],check);
}
/** No database, account state, fetch or replay. The ZIP itself is the durable resume checkpoint. */
export async function readThreadHistoryZip(file:Blob,identity:ThreadHistoryIdentity,check:()=>void,signal:AbortSignal=new AbortController().signal):Promise<ThreadHistoryBatch> {
  check();checkThreadIdentity(identity);if(file.size>CHAT_FILE_TOTAL+2*1024*1024)throw new Error('History ZIP exceeds the 130 MiB limit.');
  const entries=await readStoredZip(file,check);if(entries.size>104||!['manifest.json','messages.json','README.txt'].every(name=>entries.has(name)))fail();
  for(const [name,entry]of entries){if(entry.blob.size>(name==='messages.json'?THREAD_HISTORY_BYTES:name==='manifest.json'?16384:name==='README.txt'?8192:name==='attachments.json'?THREAD_FILES_METADATA:16*1024*1024))fail();await verifyEntry(entry,check);}
  const json=async(name:string)=>{const value=JSON.parse(await entries.get(name)!.blob.text());check();return value as unknown;};
  const m=await json('manifest.json'),raw=await json('messages.json');
  if(!object(m)||![1,2,3,4].includes(Number(m.version))||typeof m.version!=='number'||!keys(m,['format','version','distribution','owner','origin','scope','from','next','capturedAt','messages',...(m.version>=2?['files','fileBytes']:[]),...(m.version>=3?['metadata']:[]),...(m.version===4?['generation']:[])])||m.format!=='kikilink-thread-history'||m.distribution!==distribution()||m.version===4&&!validHistoryGeneration(m.generation)||
    m.owner!==identity.owner||m.origin!==identity.origin||!object(m.scope)||!keys(m.scope,['kind','containerId','id','label'])||
    m.scope.kind!==identity.scope.kind||m.scope.containerId!==identity.scope.containerId||m.scope.id!==identity.scope.id||typeof m.scope.label!=='string'||m.scope.label.length>500||
    !integer(m.from)||!Array.isArray(raw)||raw.length>THREAD_HISTORY_ROWS||m.messages!==raw.length||typeof m.capturedAt!=='string'||!Number.isFinite(Date.parse(m.capturedAt))||new Date(m.capturedAt).toISOString()!==m.capturedAt||Date.parse(m.capturedAt)>Date.now()+300000)fail();
  const version=m.version;
  const rows=raw.map(row=>threadHistoryRow(row,identity.scope,true,version>=3));checkRows(rows,m.from,m.next,THREAD_HISTORY_ROWS);check();
  if(m.version>=3){const totals=threadFieldTotals(rows);if(!object(m.metadata)||!keys(m.metadata,['messages','fields','bytes'])||m.metadata.messages!==totals.messages||m.metadata.fields!==totals.fields||m.metadata.bytes!==totals.bytes)fail();}
  if(m.version===1&&([...entries.keys()].sort().join(',')!=='README.txt,manifest.json,messages.json'||file.size>2*1024*1024))fail();
  const media=m.version>=2?await readThreadFiles(entries,rows,m.files,m.fileBytes,check,signal):undefined;check();
  return {generation:m.version===4?m.generation as string|null:null,from:m.from,next:m.next as number|null,capturedAt:m.capturedAt,rows,...(media?{media}:{})};
}
