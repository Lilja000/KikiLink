export const CHAT_FILES='files',CHAT_FILE_IMPORTS='importRecovery';
export function checkChatFileLayout(db:IDBDatabase,tx:IDBTransaction):void {
 const names=[CHAT_FILES,CHAT_FILE_IMPORTS];if(db.version!==1||db.objectStoreNames.length!==2||names.some(n=>!db.objectStoreNames.contains(n)))throw new Error('Chat file storage needs a compatible KikiLink version.');
 for(const name of names){const s=tx.objectStore(name);if(s.keyPath!=='id'||s.autoIncrement||s.indexNames.length)throw new Error('Chat file storage layout is unsupported.');}
}
export function openChatFileDatabase(name:string,factory:IDBFactory,create:boolean,check:()=>void,signal:AbortSignal):Promise<IDBDatabase> {
 check();return new Promise((resolve,reject)=>{
  let settled=false;const request=create?factory.open(name,1):factory.open(name);
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);reject(new Error('Chat file storage could not be opened safely.'));};
  const timer=setTimeout(fail,10000);signal.addEventListener('abort',fail,{once:true});request.onerror=request.onblocked=fail;
  request.onupgradeneeded=e=>{try{check();if(settled||!create||e.oldVersion!==0)throw new Error();request.result.createObjectStore(CHAT_FILES,{keyPath:'id'});request.result.createObjectStore(CHAT_FILE_IMPORTS,{keyPath:'id'});}catch{request.transaction?.abort();fail();}};
  request.onsuccess=()=>{const db=request.result;if(settled){db.close();return;}try{check();checkChatFileLayout(db,db.transaction(Array.from(db.objectStoreNames),'readonly'));}catch{db.close();fail();return;}settled=true;clearTimeout(timer);signal.removeEventListener('abort',fail);db.onversionchange=()=>db.close();resolve(db);};
 });
}
export async function chatFileInventory(name:string,factory:IDBFactory,check:()=>void):Promise<boolean> {
 check();if(typeof factory.databases!=='function')throw new Error('This browser cannot safely inspect chat file storage.');
 const entry=(await factory.databases()).find(d=>d.name===name);check();if(entry&&entry.version!==1)throw new Error('Chat file storage needs a newer KikiLink version.');return !!entry;
}
