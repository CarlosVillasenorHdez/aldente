'use client';
/**
 * useStockAlerts — notificaciones proactivas de stock bajo
 * Fix: canal Realtime se crea UNA sola vez con useRef, sin dependencia en load
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentTenantId as getTenantId } from '@/lib/tenantStore';
import { toast } from 'sonner';

export interface StockAlert {
  id: string;
  type: 'ingrediente' | 'extra';
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  severity: 'critico' | 'bajo';
}

export function useStockAlerts() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    const tid = getTenantId();
    if (!tid) { setLoading(false); return; }

    const [{ data: ings }, { data: extras }] = await Promise.all([
      supabase.from('ingredients')
        .select('id, name, stock, min_stock, unit')
        .eq('tenant_id', tid)
        .gt('min_stock', 0),
      supabase.from('extras_catalog')
        .select('id, name, stock_actual, stock_minimo, unidad')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .eq('tracks_inventory', true)
        .gt('stock_minimo', 0),
    ]);

    const next: StockAlert[] = [];

    (ings ?? []).forEach((i: any) => {
      const stock = Number(i.stock ?? 0);
      const min   = Number(i.min_stock ?? 0);
      if (stock <= min) {
        next.push({
          id: `ing-${i.id}`, type: 'ingrediente', name: i.name,
          stock, minStock: min, unit: i.unit,
          severity: stock <= 0 ? 'critico' : 'bajo',
        });
      }
    });

    (extras ?? []).forEach((e: any) => {
      const stock = Number(e.stock_actual ?? 0);
      const min   = Number(e.stock_minimo ?? 0);
      if (stock <= min) {
        next.push({
          id: `ext-${e.id}`, type: 'extra', name: e.name,
          stock, minStock: min, unit: e.unidad ?? 'pieza',
          severity: stock <= 0 ? 'critico' : 'bajo',
        });
      }
    });

    next.sort((a, b) => (a.severity === 'critico' ? -1 : 1) - (b.severity === 'critico' ? -1 : 1));
    setAlerts(next);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  // Canal Realtime — se crea UNA sola vez
  useEffect(() => {
    const tid = getTenantId();
    if (!tid || channelRef.current) return;

    const channel = supabase.channel(`stock-alerts-${tid}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ingredients',
        filter: `tenant_id=eq.${tid}`,
      }, async (payload: any) => {
        const { stock, min_stock, name } = payload.new;
        if (Number(stock) <= Number(min_stock) && Number(min_stock) > 0) {
          toast.warning(`⚠️ Stock bajo: ${name}`, {
            description: `${Number(stock).toFixed(1)} — mínimo: ${Number(min_stock).toFixed(1)}`,
            duration: 6000,
          });
        }
        await loadRef.current?.();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'extras_catalog',
        filter: `tenant_id=eq.${tid}`,
      }, async (payload: any) => {
        const { stock_actual, stock_minimo, name, tracks_inventory } = payload.new;
        if (tracks_inventory && Number(stock_actual) <= Number(stock_minimo) && Number(stock_minimo) > 0) {
          toast.warning(`⚠️ Producto bajo: ${name}`, {
            description: `${Number(stock_actual).toFixed(0)} unidades disponibles`,
            duration: 6000,
          });
        }
        await loadRef.current?.();
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    alerts,
    count: alerts.length,
    criticalCount: alerts.filter(a => a.severity === 'critico').length,
    loading,
    reload: load,
  };
}
