'use client';
/**
 * useAttendanceAlerts — detecta empleados que no han llegado a su turno
 * Se ejecuta cada 5 minutos en el dashboard del dueño.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';

export interface AttendanceAlert {
  employeeId: string;
  name: string;
  role: string;
  horaEntrada: string;
  minutosRetraso: number;
  severity: 'leve' | 'grave' | 'falta';
}

export function useAttendanceAlerts() {
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/attendance?tenant_id=${tid}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setLastChecked(new Date());

      // Notificación del browser si hay alertas graves
      if (data.alerts?.length > 0 && 'Notification' in window) {
        const graves = data.alerts.filter((a: AttendanceAlert) => a.severity !== 'leve');
        if (graves.length > 0 && Notification.permission === 'granted') {
          new Notification('⚠️ Empleados sin registrar entrada', {
            body: graves.map((a: AttendanceAlert) =>
              `${a.name} — ${a.minutosRetraso}min de retraso`).join('\n'),
            icon: '/favicon.ico',
          });
        }
      }
    } catch {
      // silencioso — no romper el dashboard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Primera verificación al montar
    check();
    // Verificar cada 5 minutos
    const id = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [check]);

  // Solicitar permiso de notificación
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return { alerts, loading, lastChecked, refresh: check, requestPermission };
}
