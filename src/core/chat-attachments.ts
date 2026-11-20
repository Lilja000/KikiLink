export interface ArchivedChatAttachments { version:1; images:string[]; audio:string[] }
const id=(v:unknown):v is string=>typeof v==='string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(v);
export function validChatAttachmentIds(value:unknown,maximum:number):value is string[] {
 return Array.isArray(value) && value.length<=maximum && value.every(id) && new Set(value).size===value.length;
}
/** Local reference metadata only. It grants no access and contains no file bytes or URL. */
export function archivedChatAttachments(value:unknown):ArchivedChatAttachments|undefined {
 if(!value || typeof value!=='object' || Array.isArray(value))return;
 const v=value as ArchivedChatAttachments;
 if(v.version!==1 || Object.keys(v).sort().join(',')!=='audio,images,version' || !validChatAttachmentIds(v.images,4) || !validChatAttachmentIds(v.audio,1) || !v.images.length&&!v.audio.length || v.images.some(id=>v.audio.includes(id)))return;
 return {version:1,images:[...v.images],audio:[...v.audio]};
}
