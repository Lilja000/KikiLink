import {scopePersistenceName} from '../core/storage-scope';
import type {KeyValueStorage} from '../core/settings';

/** Coordination metadata is device-only, outside the account payload/export namespace.
 * These tokens detect completed writes (including A -> B -> A); they are not locks or CAS. */
export const accountWritePrefix = (owner:number):string => {
  if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('A valid BC account is required.');
  return scopePersistenceName(`kikilink:write-version:${owner}:`);
};
export const accountWriteVersionKey = (owner:number,key?:string):string => accountWritePrefix(owner)+(key === undefined ? 'account' : `key:${key}`);
export function readAccountWriteVersion(storage:KeyValueStorage,owner:number,key?:string):string|null {
  const name=accountWriteVersionKey(owner,key),result=storage.getItemResult?.(name);
  if (result && !result.ok) throw new Error('Saved data changes could not be checked. Reload before continuing.');
  return result ? result.value : storage.getItem(name);
}
export function writeAccountValue(storage:KeyValueStorage,owner:number,key:string,value:string|null):void {
  const physical=scopePersistenceName(`kikilink:account:${owner}:`)+key;
  if (storage.getItem(physical) === value) return;
  const stamp=()=>{
    const token=crypto.randomUUID();
    for (const name of [accountWriteVersionKey(owner,key),accountWriteVersionKey(owner)]) {
      storage.setItem(name,token);
      if (storage.getItem(name)!==token) throw new Error('Saving the device write version could not be confirmed.');
    }
  };
  // Stamp on both sides: a capture may begin while another document is writing.
  // If metadata cannot be saved first, do not touch the payload. A later failure is uncertain.
  stamp();
  if (value===null) storage.removeItem(physical); else storage.setItem(physical,value);
  stamp();
}

export interface AccountWriteObservation { check(allowLocalWrites?:boolean):void; close():void }
/** Native storage events also cover older, uncooperative writers in other documents.
 * They do not cover raw same-document writes or provide a cross-storage transaction. */
export function observeAccountWrites(owner:number,storage:Storage=globalThis.localStorage,events:Window|undefined=globalThis.window):AccountWriteObservation {
  if (!storage) throw new Error('Saved account data could not be checked. No operation was started.');
  const initial=readAccountWriteVersion(storage,owner),prefix=scopePersistenceName(`kikilink:account:${owner}:`),versions=accountWritePrefix(owner);
  let foreign=false;
  const listener=(event:StorageEvent)=>{
    if (event.storageArea===storage && (event.key===null || event.key.startsWith(prefix) || event.key.startsWith(versions))) foreign=true;
  };
  events?.addEventListener('storage',listener);
  return {
    check(allowLocalWrites=false){
      if (foreign || (!allowLocalWrites && readAccountWriteVersion(storage,owner)!==initial))
        throw new Error('Saved account data changed during this operation. Check the saved copies and review again before continuing.');
    },
    close(){events?.removeEventListener('storage',listener);},
  };
}
