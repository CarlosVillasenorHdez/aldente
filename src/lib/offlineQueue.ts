/**
 * offlineQueue — cola de operaciones para modo sin conexión
 *
 * Cuando Supabase falla por falta de red, las órdenes del POS se guardan
 * en IndexedDB. Al recuperar la conexión se sincronizan automáticamente.
 *
 * Solo aplica al POS (órdenes + order_items). El resto del ERP requiere conexión.
 */

export interface QueuedOperation {
  id: string;           // UUID local
  table: string;        // tabla de destino en Supabase
  op: 'insert' | 'upsert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const DB_NAME = 'aldente_offline';
const STORE   = 'queue';
const DB_VER  = 1;

// ── Open IndexedDB ────────────────────────────────────────────────────────────
let _db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror   = () => reject(req.error);
  });
}

// ── Enqueue an operation ──────────────────────────────────────────────────────
export async function enqueue(op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
  const db = await openDB();
  const item: QueuedOperation = {
    ...op,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => resolve(item.id);
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Get all queued operations ─────────────────────────────────────────────────
export async function getQueue(): Promise<QueuedOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror   = () => reject(req.error);
  });
}

// ── Remove a processed operation ─────────────────────────────────────────────
export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Count pending operations ──────────────────────────────────────────────────
export async function queueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Flush queue to Supabase ───────────────────────────────────────────────────
export async function flushQueue(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>,
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  const items = await getQueue();
  if (items.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      let error: unknown = null;

      if (item.op === 'insert') {
        const res = await supabase.from(item.table as any).insert(item.payload as any);
        error = res.error;
      } else if (item.op === 'upsert') {
        const res = await supabase.from(item.table as any).upsert(item.payload as any);
        error = res.error;
      } else if (item.op === 'update') {
        const { id, ...rest } = item.payload as any;
        const res = await supabase.from(item.table as any).update(rest).eq('id', id);
        error = res.error;
      } else if (item.op === 'delete') {
        const { id } = item.payload as any;
        const res = await supabase.from(item.table as any).delete().eq('id', id);
        error = res.error;
      }

      if (error) throw error;
      await dequeue(item.id);
      synced++;
    } catch {
      failed++;
      // Increment retry count — abandon after 5 retries
      const db = await openDB();
      const updated = { ...item, retries: item.retries + 1 };
      if (updated.retries >= 5) {
        await dequeue(item.id);  // give up
      } else {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(updated);
          tx.oncomplete = () => resolve();
          tx.onerror    = () => reject(tx.error);
        });
      }
    }
    onProgress?.(synced, items.length);
  }

  return { synced, failed };
}
