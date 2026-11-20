import type { CloudClient } from './client';
import { CloudError } from './client';
import { requestAudioPlayback } from './audio-library';
import { chatFileId, type ChatFileKind } from '../storage/chat-file-model';

/** Explicit, fresh authorization. No archived URLs or persistent playback tickets. */
export async function downloadChatFile(client:CloudClient,owner:number,kind:ChatFileKind,id:string,current:()=>boolean,signal:AbortSignal):Promise<Blob> {
 chatFileId(kind,id);let invalid=false;
 const controller=new AbortController(),check=()=>{if(invalid||signal.aborted||!current()||!client.connected||client.memberNumber!==owner)throw new Error('Chat file download cancelled or Cloud account changed.');};
 const unsubscribe=client.subscribe(event=>{if(['session','media-invalidated','relationships'].includes(event)||(event==='connection'&&!client.connected)){invalid=true;controller.abort();}});
 try{
  check();if(kind==='image'){const blob=await client.media(id,undefined,{fresh:true});check();return blob;}
  const ticket=await requestAudioPlayback(client,id);check();
  const response=await fetch(ticket.url,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.any([signal,controller.signal,AbortSignal.timeout(30000)])});check();
  if(response.status!==200){await response.body?.cancel();throw new CloudError('The audio file is unavailable.',response.status);}
  if(response.headers.get('content-type')?.split(';')[0]!=='audio/mpeg'||Number(response.headers.get('content-length'))>16*1024*1024){await response.body?.cancel();throw new Error('The audio file is unavailable or too large.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('The audio file is empty.');const parts:Uint8Array<ArrayBuffer>[]= [];let bytes=0;
  try{for(;;){const part=await reader.read();check();if(part.done)break;bytes+=part.value.byteLength;if(bytes>16*1024*1024)throw new Error('The audio file exceeds 16 MiB.');parts.push(part.value);}}finally{await reader.cancel().catch(()=>{});}
  check();if(!bytes)throw new Error('The audio file is empty.');return new Blob(parts,{type:'audio/mpeg'});
 }finally{unsubscribe();controller.abort();}
}
