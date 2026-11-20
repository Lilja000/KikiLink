import {compareWorkshop} from '../../../cloud/shared/workshop-order.mjs';
import type {KeyValueStorage} from '../../core/settings';
import {copyWorkshopDraft,workshopId,type WorkshopDetail,type WorkshopDraft,type WorkshopSummary} from './workshop-model';
import type {WorkshopLock} from './workshop-installation-model';

/** IDs only: a bookmark never grants access or retains another author's content. */
export class WorkshopBookmarks {
  readonly key:string;
  constructor(readonly storage:KeyValueStorage,readonly owner:number,readonly origin:string,readonly current:()=>boolean,readonly lock?:WorkshopLock){
    if(!Number.isSafeInteger(owner)||owner<=0||!origin)throw new Error('A Workshop account is required.');
    this.key=`kikilink:workshop-bookmarks:${encodeURIComponent(origin)}:${owner}:v1`;
  }
  list():string[]{
    if(!this.current())throw new Error('Your account changed. Reopen Workshop.');
    let raw:string|null;
    try{const result=this.storage.getItemResult?.(this.key);if(result&&!result.ok)throw new Error();raw=result?result.value:this.storage.getItem(this.key);}catch{throw new Error('Saved creations could not be read. They have been kept unchanged.');}
    if(raw===null)return[];
    try{if(raw.length>5000)throw new Error();const data=JSON.parse(raw);if(!Array.isArray(data)||data.length>100||data.some(id=>!workshopId(id))||new Set(data).size!==data.length)throw new Error();return data;}
    catch{throw new Error('Saved creations contain unsupported data. They have been kept unchanged.');}
  }
  async set(id:string,saved:boolean,expected:boolean):Promise<void>{
    if(!workshopId(id))throw new Error('Invalid package ID.');
    const commit=()=>{const ids=this.list();if(ids.includes(id)!==expected)throw new Error('Another tab changed this bookmark. Refresh Workshop.');
      const next=ids.filter(value=>value!==id);if(saved)next.unshift(id);if(next.length>100)throw new Error('You can save up to 100 creations.');
      const raw=JSON.stringify(next);if(!this.current())throw new Error('Your account changed.');
      try{this.storage.setItem(this.key,raw);const result=this.storage.getItemResult?.(this.key);if(result?!result.ok||result.value!==raw:this.storage.getItem(this.key)!==raw)throw new Error();}catch{throw new Error('The bookmark save could not be confirmed. Refresh Workshop before retrying.');}
    };
    if(this.lock)await this.lock(this.key,commit);else if(globalThis.navigator?.locks)await navigator.locks.request(this.key,commit);else throw new Error('This browser needs Web Locks to save creations safely.');
  }
}
export type {WorkshopSort} from '../../../cloud/shared/workshop-order.mjs';
import type {WorkshopSort} from '../../../cloud/shared/workshop-order.mjs';
export function sortWorkshop(items:WorkshopSummary[],sort:WorkshopSort):WorkshopSummary[]{
  return [...items].sort((a,b)=>compareWorkshop(a,b,sort));
}
export function remixWorkshop(detail:WorkshopDetail):WorkshopDraft {
  const release=detail.versions.find(value=>value.version===detail.version);
  if(detail.status!=='published'||!release)throw new Error('Only a published version can be remixed.');
  const draft=copyWorkshopDraft(release),credit=`Remix of ${detail.id} v${release.version} by ${detail.authorName}.`;
  return {...draft,title:(draft.title.slice(0,72)+' (remix)').slice(0,80),description:credit+'\n\n'+draft.description.slice(0,1198-credit.length),version:'1.0.0',visibility:'unlisted',changelog:''};
}
