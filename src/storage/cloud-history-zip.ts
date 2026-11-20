import { KIKILINK_PLATFORM_PREVIEW } from '../core/distribution';
import type { LinkMessage } from '../core/types';
import { archiveChatSnapshot } from '../cloud/history-archive-model';
import { deviceDataDatabases,exportValueEncoder } from './device-data-export';
import { CHAT_IMPORT_SOURCE_LIMIT } from './chat-import-model';
import { CHAT_FILE_LIMIT,CHAT_FILE_TOTAL,chatFileKeys,type ChatFile } from './chat-file-model';
import { storedZip,type ZipFile } from '../utils/stored-zip';

/** Partial format2 archive: one direct chat and explicitly captured files, no account state or credentials. */
export async function cloudHistoryZip(options:{owner:number;peer:number;peerName:string;version:string;startedAt:string;
  messages:readonly LinkMessage[];files:readonly ChatFile[];fromCursor:number;nextCursor:number|null;cutoff:number;
  missingFiles:number;current:()=>boolean;signal:AbortSignal}):Promise<Blob> {
  const check=()=>{if(!options.current()||options.signal.aborted)throw new Error('Cloud history download cancelled.');};check();
  const specs=deviceDataDatabases(options.owner),files:ZipFile[]=[],encode=exportValueEncoder(files,check);
  if(!options.messages.length||options.files.length>CHAT_FILE_LIMIT||options.files.reduce((n,f)=>n+f.blob.size,0)>CHAT_FILE_TOTAL)throw new Error('This history batch is empty or too large.');
  chatFileKeys(options.files.map(file=>({key:file.id,value:file})));
  const json=(name:string,value:unknown)=>{const blob=new Blob([JSON.stringify(value)],{type:'application/json'});files.push({name,blob});return blob.size;};
  json('storage/account.json',{entries:[],excludedKeys:[]});
  const bytes=json('databases/0.json',archiveChatSnapshot(options.owner,options.peer,options.peerName,options.messages,check));
  if(bytes>CHAT_IMPORT_SOURCE_LIMIT)throw new Error('This chat batch exceeds the supported restore size.');
  const saved=options.files.length>0;
  if(saved)json('databases/5.json',{name:specs[5]!.name,version:1,stores:[{name:'files',keyPath:'id',autoIncrement:false,indexes:[],records:options.files.map(file=>({key:encode(file.id),value:encode(file)}))}]});
  const rows=options.messages.length+1+options.files.length;
  const databases=specs.map((spec,i)=>i===0||i===5&&saved?{...spec,status:'captured',path:`databases/${i}.json`,stores:i===0?2:1,records:i===0?options.messages.length+1:options.files.length}:{...spec,status:'absent'});
  json('manifest.json',{format:'kikilink-device-data',version:2,owner:options.owner,distribution:KIKILINK_PLATFORM_PREVIEW?'platform-preview':'stable',
    addonVersion:options.version,startedAt:options.startedAt,capturedAt:new Date().toISOString(),
    consistency:`Explicit Cloud direct-chat batch for peer ${options.peer}; exclusive before cursor ${options.fromCursor}; next older cursor ${options.nextCursor??'end'}. Pages and files are checked separately, not an atomic Cloud snapshot. Locally cleared/deleted boundary: ${options.cutoff}.`,
    encoding:'Known message fields projected as inert local history; tagged records and original validated file bytes. ZIP CRC32 detects damage, not authenticity.',
    exclusions:[`Other chats, groups, channels, settings, drafts, credentials and device data are excluded.`,`Messages outside this batch and unavailable/expired Cloud history are excluded.`,`${options.missingFiles} referenced files are not included; remote URLs and playback tickets are never archived.`,`Restoring history obeys the destination retention, capacity and deletion rules; files and references require separate reviews.`],
    databases,accountEntries:0,records:rows,payloadFiles:files.map(file=>({path:file.name,bytes:file.blob.size}))});
  files.push({name:'README.txt',blob:new Blob([`KikiLink Cloud chat history — partial device-format2 archive. Private and unencrypted.\nAccount #${options.owner}, peer #${options.peer}. ${options.messages.length} messages; ${options.files.length} files included; ${options.missingFiles} file references lack included bytes.\nNext older cursor: ${options.nextCursor??'end of available history'}. This cursor is explanatory, not an automatic resume job.\nKeep this ZIP before reading the next batch. The browser download request does not prove that a file was saved.\nRestore through Settings > Data & about > Choose device ZIP. Text, attachment references and file bytes have separate reviews. Current retention/deletion/capacity rules still apply.\nNo read receipts, delivery acknowledgements, sends or pending actions are part of this archive. This is not a full-account or atomic backup.\n`])});
  const blob=await storedZip(files,check);check();return blob;
}
