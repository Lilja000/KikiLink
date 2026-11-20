export const SOUND_DATABASE_VERSION = 2;
export const SOUND_RECORDS = 'sounds';
export const SOUND_IMPORTS = 'importRecovery';

export function checkSoundLayout(db: IDBDatabase, tx: IDBTransaction, recovery: boolean): void {
  const names = recovery ? [SOUND_RECORDS,SOUND_IMPORTS] : [SOUND_RECORDS];
  if (db.objectStoreNames.length !== names.length || names.some(name => !db.objectStoreNames.contains(name))) throw new Error('The Sound database layout is unsupported.');
  for (const name of names) {
    const store = tx.objectStore(name);
    if (store.keyPath !== 'id' || store.autoIncrement || store.indexNames.length) throw new Error('The Sound database layout is unsupported.');
  }
}

/** Schema1 → 2 only adds a recovery store. Existing sound records are never rewritten. */
export function openSoundDatabase(name: string, factory: IDBFactory, upgrade: boolean, check: () => void, signal?: AbortSignal): Promise<IDBDatabase> {
  check();
  return new Promise((resolve,reject) => {
    let settled = false, reason = 'Sound storage could not be opened. Close other KikiLink tabs and retry.';
    const request = upgrade ? factory.open(name,SOUND_DATABASE_VERSION) : factory.open(name);
    const fail = () => {
      if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort',fail);
      reject(new Error(reason));
    };
    const timer = setTimeout(fail,10000); signal?.addEventListener('abort',fail,{once:true});
    request.onerror = request.onblocked = fail;
    request.onupgradeneeded = event => {
      try {
        check(); if (settled || !upgrade || (event.oldVersion !== 0 && event.oldVersion !== 1)) throw new Error('The Sound version is unsupported.');
        if (event.oldVersion === 0) request.result.createObjectStore(SOUND_RECORDS,{keyPath:'id'});
        else checkSoundLayout(request.result,request.transaction!,false);
        request.result.createObjectStore(SOUND_IMPORTS,{keyPath:'id'});
      } catch(e) { reason = e instanceof Error ? e.message : reason; request.transaction?.abort(); fail(); }
    };
    request.onsuccess = () => {
      const db = request.result; if (settled) { db.close(); return; }
      try {
        check(); if (db.version !== 1 && db.version !== SOUND_DATABASE_VERSION) throw new Error('The Sound version is unsupported.');
        checkSoundLayout(db,db.transaction(Array.from(db.objectStoreNames),'readonly'),db.version === SOUND_DATABASE_VERSION);
      } catch(e) { reason = e instanceof Error ? e.message : reason; db.close(); fail(); return; }
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort',fail); db.onversionchange = () => db.close(); resolve(db);
    };
  });
}
