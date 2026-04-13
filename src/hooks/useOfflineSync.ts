/**
 * useOfflineSync — detecta conectividad y sincroniza la cola offline
 * Uso: llamar en POSClient para mostrar el banner y hacer sync automático
 */
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { flushQueue, queueCount } from '@/lib/offlineQueue';
import { createClient } from '@/lib/supabase/client';

export function useOfflineSync() {
  const [isOnline, setIsOnline]         = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]           = useState(false);
  const [lastSync, setLastSync]         = useState<Date | null>(null);
  const supabase = useRef(createClient()).current;

  // Actualizar conteo de operaciones pendientes
  const refreshCount = useCallback(async () => {
    const count = await queueCount();
    setPendingCount(count);
  }, []);

  // Intentar sincronizar al recuperar conexión
  const sync = useCallback(async () => {
    if (syncing) return;
    const count = await queueCount();
    if (count === 0) return;

    setSyncing(true);
    try {
      const { synced } = await flushQueue(supabase);
      if (synced > 0) {
        setLastSync(new Date());
        await refreshCount();
      }
    } finally {
      setSyncing(false);
    }
  }, [syncing, supabase, refreshCount]);

  useEffect(() => {
    // Estado inicial
    setIsOnline(navigator.onLine);
    refreshCount();

    const goOnline = () => {
      setIsOnline(true);
      sync();  // auto-sync al reconectar
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    // Verificar conectividad real cada 30s (navigator.onLine no es 100% confiable)
    const interval = setInterval(async () => {
      try {
        // Ping ligero a Supabase
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000),
        });
        if (!isOnline) {
          setIsOnline(true);
          sync();
        }
      } catch {
        setIsOnline(false);
      }
    }, 30_000);

    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pendingCount, syncing, lastSync, sync, refreshCount };
}
