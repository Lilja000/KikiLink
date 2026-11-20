import type { LinkMessage } from '../core/types';
import { archivedChatAttachments, validChatAttachmentIds, type ArchivedChatAttachments } from '../core/chat-attachments';
import { parseChatImportSource, planChatImport, chatMessageAllowed, CHAT_IMPORT_RECOVERY_LIMIT, readChatRecovery,
 type ChatImportRules, type ChatRows, type ChatImportPlan, type ChatRecoveryCopy } from './chat-import-model';
export const CHAT_ATTACHMENT_RECOVERY_KEY='kikilink:chat-attachment-recovery:v1';
export interface ChatAttachmentPlan extends ChatImportPlan { updates:LinkMessage[]; attachments:number }
const fail=():never=>{throw new Error('The archived chat attachment references are unsupported. No history was changed.');};
function decode(node:any):any {
 if(!node || typeof node!=='object')return fail();
 if(node.type==='value' || node.type==='number')return node.value;
 if(node.type==='undefined')return undefined;
 if(!Array.isArray(node.entries))return fail();
 if(node.type==='array'){
  if(!Number.isSafeInteger(node.length) || node.length<0 || node.length>4 || node.entries.length!==node.length || node.entries.some((e:any,i:number)=>!Array.isArray(e)||e.length!==2||e[0]!==String(i)))return fail();
  return node.entries.map((e:any)=>decode(e[1]));
 }
 if(node.type==='object' && node.entries.length<=3 && new Set(node.entries.map((e:any)=>e[0])).size===node.entries.length)return Object.fromEntries(node.entries.map((e:any)=>[e[0],decode(e[1])]));
 return fail();
}
function sourceReferences(source:string):Map<string,ArchivedChatAttachments> {
 const db=JSON.parse(source),records=db.stores.find((s:any)=>s.name==='messages').records,result=new Map<string,ArchivedChatAttachments>();
 // The reference-only copy cannot promise to preserve unrelated binary payloads.
 const walk=(node:any):void=>{if(!node||typeof node!=='object')return;if(['blob','file','array-buffer','array-buffer-view'].includes(node.type))throw new Error('This chat archive contains binary values. Keep the original ZIP; reference-only restore cannot preserve those files.');for(const v of Object.values(node))if(v&&typeof v==='object')walk(v);};walk(db);
 for(const r of records){
  const f=new Map<string,any>(r.value.entries);if(f.size!==r.value.entries.length)fail();
  const images=decode(f.get('cloudMediaIds')??{type:'undefined'}),audio=decode(f.get('cloudAudioIds')??{type:'undefined'}),saved=decode(f.get('archivedAttachments')??{type:'undefined'});
  if(images!==undefined&&!validChatAttachmentIds(images,4)||audio!==undefined&&!validChatAttachmentIds(audio,1)||saved!==undefined&&!archivedChatAttachments(saved))fail();
  const refs=images?.length||audio?.length ? archivedChatAttachments({version:1,images:images??[],audio:audio??[]}) : archivedChatAttachments(saved);
  if((images?.length||audio?.length)&&!refs)fail();if(refs)result.set(r.key.value,refs);
 }
 return result;
}
const baseKeys=['id','peerNumber','peerName','content','sentAt','direction','includeRoom','roomName'] as const;
export const sameChatAttachmentBase=(a:any,b:LinkMessage):boolean=>!!a && baseKeys.every(k=>Object.is(a[k],b[k]));
export const sameChatAttachmentReferences=(a:unknown,b:unknown):boolean=>JSON.stringify(archivedChatAttachments(a))===JSON.stringify(archivedChatAttachments(b));
const liveKeys=['cloudId','cloudSequence','cloudGeneration','clientMessageId','cloudMediaIds','cloudAudioIds','cloudMentions','delivery','deliveryError'];
export function planChatAttachmentImport(source:string,rows:ChatRows,rules:ChatImportRules,now:number):ChatAttachmentPlan {
 const basic=planChatImport(source,rows,rules,now),parsed=parseChatImportSource(source),refs=sourceReferences(source);
 const existing=new Map(rows.messages.map(r=>[r.key,r.value as LinkMessage])),conversations=new Map(rows.conversations.map(r=>[r.key,r.value as any])),counts=new Map<number,number>();
 for(const m of existing.values())counts.set(m.peerNumber,(counts.get(m.peerNumber)??0)+1);
 const plan:ChatAttachmentPlan={messages:[],conversations:[],updates:[],attachments:0,source,before:basic.before,duplicates:0,conflicts:0,excluded:0};
 for(const m of parsed.messages.sort((a,b)=>b.sentAt-a.sentAt||a.id.localeCompare(b.id))){
  const attachments=refs.get(m.id);if(!attachments){plan.excluded++;continue;}const old=existing.get(m.id);
  if(old && (!sameChatAttachmentBase(old,m) || liveKeys.some(k=>(old as any)[k]!==undefined))){plan.conflicts++;continue;}
  if(old?.archivedAttachments!==undefined){if(sameChatAttachmentReferences(old.archivedAttachments,attachments))plan.duplicates++;else plan.conflicts++;continue;}
  if(!chatMessageAllowed(m,rules,now) || conversations.get(m.peerNumber)?.hiddenAt!==undefined || parsed.hints.get(m.peerNumber)?.hiddenAt!==undefined || !old&&(counts.get(m.peerNumber)??0)>=rules.maxMessages){plan.excluded++;continue;}
  const restored={...m,archivedAttachments:attachments};plan.attachments+=attachments.images.length+attachments.audio.length;
  if(old)plan.updates.push(restored);else{plan.messages.push(restored);counts.set(m.peerNumber,(counts.get(m.peerNumber)??0)+1);}
 }
 for(const peer of new Set(plan.messages.map(m=>m.peerNumber)))if(!conversations.has(peer)){
  const newest=[...plan.messages,...existing.values()].filter(m=>m.peerNumber===peer).sort((a,b)=>b.sentAt-a.sentAt)[0]!,hint=parsed.hints.get(peer);
  const text=newest.content || (newest.archivedAttachments?.audio.length?'Saved audio':'Saved image');
  plan.conversations.push({peerNumber:peer,peerName:newest.peerName,lastMessage:text,lastMessageAt:newest.sentAt,lastDirection:newest.direction,unread:0,draft:'',pinned:hint?.pinned===true,
   ...(typeof hint?.localAlias==='string'&&hint.localAlias.length<=100?{localAlias:hint.localAlias}:{}),...(hint?.muteUntil===-1||Number.isSafeInteger(hint?.muteUntil)&&hint!.muteUntil>=0&&hint!.muteUntil<=8640000000000000?{muteUntil:hint!.muteUntil}:{})});
 }
 return plan;
}
export function readChatAttachmentRecovery(raw:string|null):ChatRecoveryCopy[] {
 const copies=readChatRecovery(raw);
 for(const c of copies){sourceReferences(c.source);const added=JSON.parse(c.added);
  if(Object.keys(added).sort().join(',')!=='conversations,messages,updates'||!Array.isArray(added.updates)||added.messages.length+added.updates.length>10000)fail();
  const all=[...added.messages,...added.updates];if(new Set(all.map(m=>m?.id)).size!==all.length)fail();
  const source=new Map(parseChatImportSource(c.source).messages.map(m=>[m.id,m])),refs=sourceReferences(c.source);
  for(const m of all)if(!source.has(m?.id)||!sameChatAttachmentBase(m,source.get(m.id)!)||!archivedChatAttachments(m.archivedAttachments)||!sameChatAttachmentReferences(m.archivedAttachments,refs.get(m.id))||m.read!==true||Object.keys(m).some(k=>![...baseKeys,'read','archivedAttachments'].includes(k as any)))fail();
 }
 return copies;
}
export function prepareChatAttachmentRecovery(raw:string|null,plan:ChatAttachmentPlan):{raw:string;copy:ChatRecoveryCopy} {
 const copies=readChatAttachmentRecovery(raw),added=JSON.stringify({messages:plan.messages,conversations:plan.conversations,updates:plan.updates});
 const known=copies.find(c=>c.before===plan.before&&c.source===plan.source&&c.added===added);if(known)return {raw:raw!,copy:known};
 if(copies.length>=3)throw new Error('Three chat attachment recovery copies are already kept. No history was changed.');
 const id=Math.max(0,...copies.map(c=>c.id))+1;if(id>=Number.MAX_SAFE_INTEGER)fail();
 const copy={id,createdAt:Date.now(),before:plan.before,source:plan.source,added};copies.push(copy);const next=JSON.stringify({format:1,copies});
 if(new TextEncoder().encode(next).length>CHAT_IMPORT_RECOVERY_LIMIT)throw new Error('There is not enough room for the chat attachment recovery copy. No history was changed.');
 readChatAttachmentRecovery(next);return {raw:next,copy};
}
