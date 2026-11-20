import {archivedFieldBytes,readInertArchivedFields,INERT_ARCHIVED_FIELDS_LIMIT,INERT_ARCHIVED_FIELDS_TOTAL,type Envelope} from '../storage/inert-archived-fields';

type Kind='group'|'channel';
type Node={type:string;[key:string]:unknown};
export const THREAD_FIELD_BYTES=INERT_ARCHIVED_FIELDS_LIMIT;
const known=new Set(['id','sequence','sender','author','createdAt','text','deletedAt','mediaIds','audioIds','conversationId','channelId','communityId','schemaVersion','encryption','membershipVersion','keyVersion','archivedFields']);
const transport=new Set(['clientid','clientmessageid','pending','retry','retryid','outbox','state','status','delivery','deliveryerror','receiptstate','readcursor','peerreadcursor','readat','deliveredat','ack','read','received','url','urls','mediaurl','audiourl','playbackurl','playbackticket','ticket','token','accesstoken','refreshtoken','credentials','credential','secret','privatekey','devicekey','encryptionkey','ciphertext','iv','nonce','tag']);
const excluded=(key:string)=>known.has(key)||transport.has(key.toLowerCase().replace(/[-_:]/g,''));
const policy=(kind:Kind)=>({format:'kikilink-inert-thread-fields',kind,knownFields:known});
function fail():never{throw new Error('Additional thread fields are unsupported or too large. The previous complete history batch is kept.');}
const plain=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));

/** Canonical JSON tags, never active objects or constructors from the source. */
export function captureThreadFields(raw:Record<string,unknown>,kind:Kind):string|undefined{
 const names=Object.keys(raw).filter(key=>!excluded(key)).sort();if(!names.length)return;if(names.length>4096)fail();
 let count=0;const ancestors=new Set<object>();
 const tag=(value:unknown,depth=0):Node=>{
  if(++count>4096||depth>32)fail();
  if(value===null||typeof value==='boolean'||typeof value==='string'){if(typeof value==='string'&&value.length>THREAD_FIELD_BYTES)fail();return {type:'value',value};}
  if(typeof value==='number'){if(!Number.isFinite(value))fail();return {type:'number',value:Object.is(value,-0)?'-0':value};}
  if(!Array.isArray(value)&&!plain(value)||ancestors.has(value as object))fail();
  const object=value as object;ancestors.add(object);
  try{
   const array=Array.isArray(value);if(array&&(value.length>4096||Object.keys(value).length!==value.length))fail();
   const keys=array?Array.from({length:value.length},(_,i)=>String(i)):Object.keys(object).sort();if(keys.length>4096)fail();
   const entries=keys.map(key=>{if(key.length>2048)fail();const d=Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))fail();return [key,tag(d.value,depth+1)];});
   return array?{type:'array',length:value.length,entries}:{type:'object',entries};
  }finally{ancestors.delete(object);}
 };
 const fields=names.map(key=>{if(key.length>2048)fail();const d=Object.getOwnPropertyDescriptor(raw,key);if(!d||!Object.hasOwn(d,'value'))fail();return [key,tag(d.value)];});
 const result=JSON.stringify({format:policy(kind).format,version:1,kind,fields,files:[]});readThreadFields(result,kind);return result;
}
/** Validate the inert JSON subset without turning tagged data into live fields. */
export function readThreadFields(raw:string,kind:Kind):Envelope{
 const e=readInertArchivedFields(raw,policy(kind));if(e.files.length||e.fields.some(([key])=>excluded(key)))fail();let count=0;
 const ordered=(entries:Array<[string,unknown]>)=>entries.every(([key],i)=>key.length<=2048&&(!i||entries[i-1]![0]<key));
 const visit=(v:unknown,depth=0):void=>{
  if(++count>4096||depth>32)fail();const n=v as Node;
  if(n.type==='value')return;
  if(n.type==='number'){if(n.value!=='-0'&&(typeof n.value!=='number'||!Number.isFinite(n.value)))fail();return;}
  if(n.type!=='object'&&n.type!=='array')fail();const entries=n.entries as Array<[string,unknown]>;
  if(n.type==='object'?!ordered(entries):n.length!==entries.length||entries.some(([key],i)=>key!==String(i)))fail();
  for(const [,child]of entries)visit(child,depth+1);
 };
 if(!ordered(e.fields))fail();for(const [,value]of e.fields)visit(value);return e;
}
export function threadFieldTotals(rows:readonly {archivedFields?:string}[]):{messages:number;fields:number;bytes:number}{
 let messages=0,fields=0,bytes=0;
 for(const row of rows)if(row.archivedFields!==undefined){messages++;fields+=(JSON.parse(row.archivedFields) as Envelope).fields.length;bytes+=archivedFieldBytes(row.archivedFields);}
 if(bytes>INERT_ARCHIVED_FIELDS_TOTAL)fail();return {messages,fields,bytes};
}
