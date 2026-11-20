export interface DeviceStoreSnapshot {
  name: string; keyPath: string | string[] | null; autoIncrement: boolean;
  indexes: Array<{ name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }>;
  records: Array<{ key: IDBValidKey; value: unknown }>;
}
export interface DeviceDatabaseSnapshot { name: string; version: number; stores: DeviceStoreSnapshot[] }
export interface DeviceSnapshotDatabase { name: string; version: number }

const OPEN_TIMEOUT = 10000, CAPTURE_TIMEOUT = 20000, MAX_ROWS = 100000;

function openExisting(factory: IDBFactory, spec: DeviceSnapshotDatabase, check: () => void, signal: AbortSignal): Promise<IDBDatabase> {
  check();
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = factory.open(spec.name);
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', fail); };
    const fail = () => {
      if (settled) return; settled = true; finish();
      reject(new Error('A saved database could not be opened safely. No export was created.'));
    };
    const timer = setTimeout(fail, OPEN_TIMEOUT); signal.addEventListener('abort', fail, { once: true });
    request.onupgradeneeded = () => { request.transaction?.abort(); fail(); };
    request.onerror = request.onblocked = fail;
    request.onsuccess = () => {
      const database = request.result;
      if (settled) { database.close(); return; }
      try { check(); if (database.version !== spec.version) throw new Error(); }
      catch { database.close(); fail(); return; }
      settled = true; finish(); resolve(database);
    };
  });
}

/**
 * Hold every existing database's complete readonly scope until all cursors and
 * the boundary check finish. The native scheduler also covers non-cooperating
 * IndexedDB writers. Release before encoding, hashing or constructing the ZIP.
 * This does not lock localStorage, absent databases or a multi-step writer's
 * application-level operation, and is not a transaction for Cloud restoration.
 */
export async function captureDeviceDatabases(factory: IDBFactory, specs: DeviceSnapshotDatabase[], check: () => void,
  signal: AbortSignal, boundary: () => Promise<void>): Promise<DeviceDatabaseSnapshot[]> {
  check();
  if (specs.length > 7 || new Set(specs.map(spec => spec.name)).size !== specs.length ||
      specs.some(spec => !spec.name || !Number.isSafeInteger(spec.version) || spec.version < 1 || spec.version > 2))
    throw new Error('A saved database has an unsupported layout.');
  const databases: IDBDatabase[] = [], opening = new AbortController();
  const openingSignal = AbortSignal.any([signal, opening.signal]);
  const openingCheck = () => { check(); if (openingSignal.aborted) throw new Error('Saved database data changed during export. No download was created.'); };
  try {
    // Open everything before holding scopes, so blocked opens cannot retain
    // unrelated writers. A version change during this phase cancels the set.
    for (const spec of specs) {
      const database = await openExisting(factory, spec, openingCheck, openingSignal);
      database.onversionchange = () => { opening.abort(); database.close(); };
      databases.push(database);
    }
    openingCheck();
    if (!databases.length) { await boundary(); openingCheck(); return []; }
    return await new Promise<DeviceDatabaseSnapshot[]>((resolve, reject) => {
      const transactions: IDBTransaction[] = [], snapshots: DeviceDatabaseSnapshot[] = [];
      let settled = false, released = false, remaining = databases.length, completed = 0, rows = 0;
      const finish = () => { clearTimeout(timer); openingSignal.removeEventListener('abort', cancelled); };
      const fail = (error: unknown) => {
        if (settled) return; settled = true; finish();
        for (const transaction of transactions) { try { transaction.abort(); } catch { /* Already finished. */ } }
        reject(error instanceof DOMException ? new Error('A saved database could not be read completely. No export was created.') :
          error instanceof Error ? error : new Error('Saved databases could not be read together. No export was created.'));
      };
      const cancelled = () => fail(new Error('Device export cancelled.'));
      const timer = setTimeout(() => fail(new Error('Saved databases are busy or took too long to read together. No export was created. Try again after changes have settled.')), CAPTURE_TIMEOUT);
      openingSignal.addEventListener('abort', cancelled, { once: true });
      const ready = () => {
        if (--remaining || settled) return;
        // Each transaction still has a keep-alive request in flight here.
        void (async () => {
          try { openingCheck(); await boundary(); openingCheck(); if (!settled) released = true; }
          catch (error) { fail(error); }
        })();
      };
      try {
        openingCheck();
        for (const [index, database] of databases.entries()) {
          const names = Array.from(database.objectStoreNames);
          if (!names.length || names.length > 32) throw new Error('A saved database has an unsupported layout.');
          const transaction = database.transaction(names, 'readonly'); transactions.push(transaction);
          const snapshot: DeviceDatabaseSnapshot = { name: specs[index]!.name, version: database.version, stores: [] }; snapshots.push(snapshot);
          database.onversionchange = () => fail(new Error('Saved database data changed during export. No download was created.'));
          transaction.onabort = transaction.onerror = () => fail(new Error('A saved database could not be read completely. No export was created.'));
          transaction.oncomplete = () => {
            if (settled) return;
            if (!released) { fail(new Error('Saved databases could not be held together. No export was created.')); return; }
            if (++completed === databases.length) {
              try { openingCheck(); settled = true; finish(); resolve(snapshots); } catch (error) { fail(error); }
            }
          };
          const keepAlive = () => {
            if (settled || released) return;
            try {
              openingCheck();
              const request = transaction.objectStore(names[0]!).getKey(0);
              request.onerror = () => fail(new Error('A saved database could not be held for the snapshot.'));
              request.onsuccess = keepAlive;
            } catch (error) { fail(error); }
          };
          keepAlive(); let storesRemaining = names.length;
          for (const name of names) {
            const store = transaction.objectStore(name), saved: DeviceStoreSnapshot = {
              name, keyPath: store.keyPath, autoIncrement: store.autoIncrement,
              indexes: Array.from(store.indexNames, name => { const index = store.index(name); return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }; }), records: [],
            };
            snapshot.stores.push(saved); const request = store.openCursor();
            request.onerror = () => fail(new Error('A saved database could not be read completely. No export was created.'));
            request.onsuccess = () => {
              if (settled) return;
              try {
                openingCheck(); const cursor = request.result;
                if (!cursor) { if (!--storesRemaining) ready(); return; }
                if (++rows > MAX_ROWS) throw new Error('There are too many saved records for one device export.');
                saved.records.push({ key: cursor.primaryKey, value: cursor.value }); cursor.continue();
              } catch (error) { fail(error); }
            };
          }
        }
      } catch (error) { fail(error); }
    });
  } finally { for (const database of databases) database.close(); }
}
