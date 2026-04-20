'use client';

/**
 * useOnlineSync — escucha el evento 'online' del navegador y vacía
 * la cola de IndexedDB (offlineQueue) automáticamente al reconectar.
 *
 * Úsalo en el layout raíz del ERP para que esté siempre activo.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { flushQueue, queueCount } from '@/lib/offlineQueue';
import { toast } from 'sonner';

export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const supabase = createClient();
  const lastFlush = useRef(0);

  // Actualizar contador de pendientes cada vez que cambia la conexión
  const refreshCount = useCallback(async () => {
    try {
      const n = await queueCount();
      setPendingCount(n);
    } catch { /* IndexedDB no disponible en SSR */ }
  }, []);

  // Vaciar la cola cuando se recupera la conexión
  const flush = useCallback(async () => {
    const now = Date.now();
    // Evitar flushes duplicados en menos de 5 segundos
    if (now - lastFlush.current < 5000) return;
    lastFlush.current = now;

    const count = await queueCount().catch(() => 0);
    if (count === 0) return;

    setSyncing(true);
    try {
      const { synced, failed } = await flushQueue(supabase, (s, t) => {
        // progreso opcional
      });

      if (synced > 0) {
        toast.success(`${synced} operación${synced > 1 ? 'es' : ''} sincronizada${synced > 1 ? 's' : ''} correctamente`);
      }
      if (failed > 0) {
        toast.error(`${failed} operación${failed > 1 ? 'es' : ''} no se pudieron sincronizar`);
      }

      await refreshCount();
    } catch (err) {
      toast.error('Error al sincronizar operaciones pendientes');
    } finally {
      setSyncing(false);
    }
  }, [supabase, refreshCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Pequeño delay para asegurar que la red está estable
      setTimeout(flush, 1500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sin conexión — las órdenes se guardan localmente', {
        duration: 5000,
        id: 'offline-toast', // evitar duplicados
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cargar count inicial
    refreshCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flush, refreshCount]);

  return { isOnline, pendingCount, syncing, flush };
}
