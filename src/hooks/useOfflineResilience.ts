'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PendingOperation {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'aldente_offline_queue';

function loadQueue(): PendingOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch { return []; }
}

function saveQueue(queue: PendingOperation[]) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * useOfflineResilience — provides:
 * - isOnline: real-time network status
 * - enqueue: add an operation to the offline queue
 * - pendingCount: number of operations waiting to sync
 * - retryAll: attempt to flush the queue (call when back online)
 *
 * Usage: wrap critical DB writes with `if (!isOnline) { enqueue(...) } else { doWrite() }`
 */
export function useOfflineResilience() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [queue, setQueue] = useState<PendingOperation[]>(loadQueue);

  useEffect(() => {
    const setOnline  = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online',  setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online',  setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  const enqueue = useCallback((type: string, payload: Record<string, unknown>) => {
    const op: PendingOperation = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue(prev => {
      const next = [...prev, op];
      saveQueue(next);
      return next;
    });
    return op.id;
  }, []);

  const remove = useCallback((id: string) => {
    setQueue(prev => {
      const next = prev.filter(op => op.id !== id);
      saveQueue(next);
      return next;
    });
  }, []);

  const retryAll = useCallback(async (
    handler: (op: PendingOperation) => Promise<boolean>
  ) => {
    const current = loadQueue();
    for (const op of current) {
      try {
        const success = await handler(op);
        if (success) remove(op.id);
        else {
          setQueue(prev => {
            const next = prev.map(o => o.id === op.id ? { ...o, retries: o.retries + 1 } : o);
            saveQueue(next);
            return next;
          });
        }
      } catch { /* silent */ }
    }
  }, [remove]);

  return { isOnline, enqueue, remove, retryAll, pendingCount: queue.length, queue };
}
