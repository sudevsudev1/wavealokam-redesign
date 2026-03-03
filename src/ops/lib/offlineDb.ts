const DB_NAME = 'wavealokam_ops';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const SYNC_QUEUE_STORE = 'sync_queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(id: string, formType: string, data: Record<string, unknown>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, 'readwrite');
  tx.objectStore(DRAFTS_STORE).put({ id, formType, data, savedAt: new Date().toISOString() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDraft(id: string): Promise<Record<string, unknown> | null> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, 'readonly');
  const req = tx.objectStore(DRAFTS_STORE).get(id);
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result?.data || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(DRAFTS_STORE, 'readwrite');
  tx.objectStore(DRAFTS_STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addToSyncQueue(entry: { table: string; operation: string; data: Record<string, unknown>; clientId: string }): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  tx.objectStore(SYNC_QUEUE_STORE).add({ ...entry, createdAt: new Date().toISOString(), status: 'pending' });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSyncQueue(): Promise<Array<Record<string, unknown>>> {
  const db = await openDb();
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
  const req = tx.objectStore(SYNC_QUEUE_STORE).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeSyncEntry(id: number): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
  tx.objectStore(SYNC_QUEUE_STORE).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
