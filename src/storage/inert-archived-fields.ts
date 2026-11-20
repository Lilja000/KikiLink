/** Bounded tagged values remain inactive strings; never instantiate archive data. */
export const INERT_ARCHIVED_FIELDS_LIMIT=128*1024;
export const INERT_ARCHIVED_FIELDS_TOTAL=1024*1024;
export interface InertFieldPolicy {readonly format:string;readonly kind:string;readonly knownFields:ReadonlySet<string>}
type Node=Record<string,unknown>;
export interface Envelope {format:string;version:1;kind:string;fields:Array<[string,unknown]>;files:Array<[string,string]>}
export const archivedFieldBytes=(text:string)=>new TextEncoder().encode(text).length;
function fail():never{throw new Error('Additional archived fields are unsupported or too large. Keep the original ZIP; no data was changed.');}
const object=(v:unknown):Node=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Node:fail();
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:fail();
const text=(v:unknown):string=>typeof v==='string'?v:fail();
const exact=(v:Node,keys:string[])=>{if(Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail();};
const integer=(v:unknown,max=Number.MAX_SAFE_INTEGER):number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=max?v:fail();
export const archiveFieldEntries=(v:unknown):Array<[string,unknown]>=>{const seen=new Set<string>();return array(v).map(item=>{const p=array(item);if(p.length!==2)fail();const key=text(p[0]);if(seen.has(key))fail();seen.add(key);return [key,p[1]];});};
export const archiveBinaryPath=(v:unknown):string=>{const p=text(v);if(!/^binary\/[0-9]{5}\.bin$/.test(p))fail();return p;};
const base64=(bytes:Uint8Array):string=>{let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
const base64Bytes=(v:unknown):number=>{const s=text(v);if(s.length>INERT_ARCHIVED_FIELDS_LIMIT||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))fail();const raw=atob(s);if(btoa(raw)!==s)fail();return raw.length;};
const parse=(raw:string):unknown=>{try{return JSON.parse(raw);}catch{return fail();}};

// Inspect tags only. In particular, array lengths never allocate arrays and typed
// array names never select constructors. Binary bytes remain base64 in this string.
function validateFields(fields:Array<[string,unknown]>,policy:InertFieldPolicy,binaries:Map<string,number>,check:()=>void):Set<string>{
 let nodes=0;const used=new Set<string>();
 const binary=(v:unknown):number=>{const p=archiveBinaryPath(v),size=binaries.get(p);if(size===undefined||used.has(p))fail();used.add(p);return size;};
 const visit=(value:unknown,depth=0):void=>{
  check();if(++nodes>10000||depth>64)fail();const n=object(value),type=text(n.type);
  switch(type){
   case 'value':exact(n,['type','value']);if(n.value!==null&&!['string','boolean'].includes(typeof n.value))fail();break;
   case 'number':exact(n,['type','value']);if(!(typeof n.value==='number'&&Number.isFinite(n.value))&&!['-0','NaN','Infinity','-Infinity'].includes(n.value as string))fail();break;
   case 'undefined':exact(n,['type']);break;
   case 'bigint':exact(n,['type','value']);if(!/^(0|-?[1-9][0-9]*)$/.test(text(n.value)))fail();break;
   case 'date':{exact(n,['type','milliseconds']);visit(n.milliseconds,depth+1);const m=object(n.milliseconds);if(m.type!=='number'||!(m.value==='NaN'||typeof m.value==='number'&&Number.isInteger(m.value)&&Math.abs(m.value)<=8640000000000000))fail();break;}
   case 'blob':exact(n,['type','path','mimeType']);text(n.mimeType);binary(n.path);break;
   case 'file':exact(n,['type','path','mimeType','name','lastModified']);text(n.mimeType);text(n.name);if(typeof n.lastModified!=='number'||!Number.isFinite(n.lastModified)||!Number.isInteger(n.lastModified))fail();binary(n.path);break;
   case 'array-buffer':exact(n,['type','path']);binary(n.path);break;
   case 'array-buffer-view':{exact(n,['type','name','byteOffset','byteLength','buffer']);const sizes:Record<string,number>={Int8Array:1,Uint8Array:1,Uint8ClampedArray:1,Int16Array:2,Uint16Array:2,Float16Array:2,Int32Array:4,Uint32Array:4,Float32Array:4,Float64Array:8,BigInt64Array:8,BigUint64Array:8,DataView:1},name=text(n.name);if(!Object.hasOwn(sizes,name))fail();const size=sizes[name]!,offset=integer(n.byteOffset),length=integer(n.byteLength),buffer=object(n.buffer);if(buffer.type!=='array-buffer')fail();visit(buffer,depth+1);if(offset%size||length%size||offset+length>binaries.get(archiveBinaryPath(buffer.path))!)fail();break;}
   case 'object':case 'array':{exact(n,type==='array'?['type','length','entries']:['type','entries']);const length=type==='array'?integer(n.length,0xffffffff):0;for(const [key,child]of archiveFieldEntries(n.entries)){if(type==='array'&&(key==='length'||/^(0|[1-9][0-9]*)$/.test(key)&&Number(key)<0xffffffff&&Number(key)>=length))fail();visit(child,depth+1);}break;}
   case 'map':exact(n,['type','entries']);for(const p of array(n.entries)){const pair=array(p);if(pair.length!==2)fail();visit(pair[0],depth+1);visit(pair[1],depth+1);}break;
   case 'set':exact(n,['type','values']);for(const child of array(n.values))visit(child,depth+1);break;
   default:fail();
  }
 };
 for(const [key,node]of archiveFieldEntries(fields)){if(policy.knownFields.has(key))fail();visit(node);}
 return used;
}
export function readInertArchivedFields(raw:string,policy:InertFieldPolicy,check:()=>void=()=>{}):Envelope{
 check();if(raw.length>INERT_ARCHIVED_FIELDS_LIMIT||archivedFieldBytes(raw)>INERT_ARCHIVED_FIELDS_LIMIT)fail();const e=object(parse(raw));exact(e,['format','version','kind','fields','files']);if(e.format!==policy.format||e.version!==1||e.kind!==policy.kind)fail();
 const fields=archiveFieldEntries(e.fields),files=archiveFieldEntries(e.files).map(([p,v]):[string,string]=>[archiveBinaryPath(p),text(v)]),sizes=new Map(files.map(([p,s])=>[p,base64Bytes(s)]));
 const used=validateFields(fields,policy,sizes,check);if(!fields.length||used.size!==files.length)fail();return e as unknown as Envelope;
}

/** The caller owns a parsed copy of entries and freezes file references before awaits. */
export async function prepareInertArchivedFields(entries:Array<[string,unknown]>,files:ReadonlyMap<string,Blob>,policy:InertFieldPolicy,check:()=>void):Promise<string|undefined>{
 check();const byName=new Map(entries),extra=entries.filter(([key])=>!policy.knownFields.has(key));
   const saved=byName.get('archivedFields');let envelope:Envelope|undefined;
   if(saved!==undefined){const n=object(saved);if(n.type==='undefined')exact(n,['type']);else{exact(n,['type','value']);if(n.type!=='value')fail();envelope=readInertArchivedFields(text(n.value),policy,check);}}
   if(extra.length){
    if(archivedFieldBytes(JSON.stringify(extra))>INERT_ARCHIVED_FIELDS_LIMIT)fail();const paths=validateFields(extra,policy,new Map([...files].map(([p,b])=>[p,b.size])),check),bytes:Array<[string,string]>=[];
    if([...paths].reduce((sum,p)=>sum+files.get(p)!.size,0)>INERT_ARCHIVED_FIELDS_LIMIT*3/4)fail();
    for(const p of paths){const blob=files.get(p)!;const data=await blob.arrayBuffer();check();if(data.byteLength!==blob.size)fail();bytes.push([p,base64(new Uint8Array(data))]);}
    if(envelope){const keys=new Set(envelope.fields.map(([k])=>k));if(extra.some(([k])=>keys.has(k)))throw new Error('Additional archived fields conflict with their saved copy. Keep the original ZIP; no data was changed.');
     const occupied=new Set(envelope.files.map(([p])=>p)),mapping=new Map<string,string>();let n=0;
     for(const pair of bytes){const original=pair[0];let target=original;while(occupied.has(target))target=`binary/${String(++n).padStart(5,'0')}.bin`;occupied.add(target);mapping.set(original,target);pair[0]=target;}
     const rename=(value:unknown):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){for(const child of value)rename(child);return;}const node=value as Node;if(['blob','file','array-buffer'].includes(String(node.type))&&typeof node.path==='string')node.path=mapping.get(node.path)??node.path;for(const child of Object.values(node))rename(child);};for(const [,node]of extra)rename(node);
    }
    envelope={format:policy.format,version:1,kind:policy.kind,fields:[...(envelope?.fields??[]),...extra],files:[...(envelope?.files??[]),...bytes]};
   }

 if(!envelope)return undefined;
 const payload=JSON.stringify(envelope);readInertArchivedFields(payload,policy,check);return payload;
}
