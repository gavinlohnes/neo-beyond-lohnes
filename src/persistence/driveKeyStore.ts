import type { Wraps } from "../domain/driveBackup";

/**
 * DRIVE-BACKUP-001: the device's backup data key, kept as a NON-extractable WebCrypto CryptoKey in its own
 * IndexedDB database ("beyond-drive-key"), separate from BEYOND's Dexie database. Because it is not a
 * table of db.ts it is never part of db.export(), so a backup never contains the key that opens it, and
 * no Dexie version change is needed. The wraps stored beside it are public (they are in every header).
 */
export interface DriveKeyRecord { dataKey: CryptoKey; wraps: Wraps; iterations: number; createdAt: string }
const DB_NAME = "beyond-drive-key", STORE = "keys", ID = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode), request = body(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export const saveDriveKey = (record: DriveKeyRecord) => run("readwrite", (store) => store.put(record, ID)).then(() => undefined);
export const readDriveKey = () => run<DriveKeyRecord | undefined>("readonly", (store) => store.get(ID));
export const clearDriveKey = () => run("readwrite", (store) => store.delete(ID)).then(() => undefined);
